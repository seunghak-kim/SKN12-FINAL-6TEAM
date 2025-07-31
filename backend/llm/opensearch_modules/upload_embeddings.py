#!/usr/bin/env python3
"""
OpenSearch Embeddings Upload Script
Uploads embedding files from the embeddings directory to OpenSearch
"""

import os
import sys
import json
import argparse
from pathlib import Path
from typing import Optional, Dict, Any

# Add current directory to path for imports
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from opensearch_config import ConfigManager
from opensearch_client import OpenSearchEmbeddingClient


def load_embedding_files(embeddings_dir: str) -> Dict[str, Any]:
    """Load all embedding JSON files from the directory"""
    embedding_files = [
        'rag_doc_person_embeddings.json',
        'rag_doc_house_embeddings.json', 
        'rag_doc_tree_embeddings.json'
    ]
    
    all_data = {}
    
    for filename in embedding_files:
        filepath = os.path.join(embeddings_dir, filename)
        
        if os.path.exists(filepath):
            try:
                with open(filepath, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                
                doc_name = filename.replace('_embeddings.json', '').replace('rag_doc_', '')
                all_data[doc_name] = data
                print(f"✓ Loaded: {filename} ({len(data)} elements)")
            except Exception as e:
                print(f"✗ Failed to load {filename}: {e}")
        else:
            print(f"✗ File not found: {filepath}")
    
    return all_data


def upload_embeddings_to_opensearch(
    embeddings_dir: str = './embeddings',
    index_name: str = 'psychology_analysis',
    host: str = 'localhost',
    port: int = 9200,
    username: str = 'admin',
    password: str = 'MyStrongPassword123!',
    create_index: bool = True,
    force_recreate: bool = False
) -> bool:
    """
    Upload embeddings to OpenSearch
    
    Args:
        embeddings_dir: Directory containing embedding files
        index_name: OpenSearch index name
        host: OpenSearch host
        port: OpenSearch port
        username: OpenSearch username
        password: OpenSearch password
        create_index: Whether to create index if it doesn't exist
        force_recreate: Whether to delete and recreate existing index
    
    Returns:
        bool: Success status
    """
    
    try:
        # Initialize OpenSearch client
        print(f"Connecting to OpenSearch at {host}:{port}...")
        client = OpenSearchEmbeddingClient(
            host=host,
            port=port,
            username=username,
            password=password
        )
        
        # Check if index exists
        index_exists = client.client.indices.exists(index=index_name)
        
        if force_recreate and index_exists:
            print(f"Deleting existing index: {index_name}")
            client.client.indices.delete(index=index_name)
            index_exists = False
        
        # Create index if needed
        if create_index and not index_exists:
            print(f"Creating index: {index_name}")
            success = client.create_embedding_index(index_name)
            if not success:
                print(f"Failed to create index: {index_name}")
                return False
        elif index_exists:
            print(f"Using existing index: {index_name}")
        
        # Load embedding files
        print(f"Loading embedding files from: {embeddings_dir}")
        all_data = load_embedding_files(embeddings_dir)
        
        if not all_data:
            print("No embedding data found to upload")
            return False
        
        # Upload embeddings
        print("Starting bulk upload to OpenSearch...")
        response = client.index_embedding_data(index_name, embeddings_dir)
        
        if response:
            print("✓ Upload completed successfully!")
            
            # Show index statistics
            stats = client.get_index_stats(index_name)
            if stats:
                print(f"\nIndex Statistics:")
                print(f"  Total documents: {stats['total_docs']}")
                print(f"  Index size: {stats['index_size']} bytes")
                print(f"  Documents by type: {stats['documents']}")
                print(f"  Top elements: {dict(list(stats['elements'].items())[:5])}")
            
            return True
        else:
            print("✗ Upload failed")
            return False
            
    except Exception as e:
        print(f"✗ Error during upload: {e}")
        return False


def main():
    """Main function with command line interface"""
    parser = argparse.ArgumentParser(
        description="Upload embedding files to OpenSearch",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Basic upload to psychology_analysis index
  python upload_embeddings.py
  
  # Upload with force recreate (delete existing index first)
  python upload_embeddings.py --force-recreate
  
  # Upload to remote OpenSearch cluster
  python upload_embeddings.py --host your-opensearch-host.com --port 443 --username admin --password your-password
  
  # Custom embeddings directory
  python upload_embeddings.py --embeddings-dir /path/to/your/embeddings
  
  # Dry run to see what would be uploaded
  python upload_embeddings.py --dry-run
  
  # Upload specific files to psychology_analysis index:
  # - rag_doc_person_embeddings.json (사람 그림 심리 분석 데이터)
  # - rag_doc_house_embeddings.json (집 그림 심리 분석 데이터)  
  # - rag_doc_tree_embeddings.json (나무 그림 심리 분석 데이터)
  
Data Structure:
  Each embedding file contains psychological analysis data with:
  - Elements like "표정", "눈", "크기", "위치" etc.
  - Korean text descriptions with conditions and interpretations
  - 1024-dimensional KURE-v1 embeddings
  - Will be indexed to "psychology_analysis" with document types: person, house, tree
        """
    )
    
    parser.add_argument(
        '--embeddings-dir', 
        default='./embeddings',
        help='Directory containing embedding files (default: ./embeddings)'
    )
    
    parser.add_argument(
        '--index', 
        default='psychology_analysis',
        help='OpenSearch index name (default: psychology_analysis)'
    )
    
    parser.add_argument(
        '--host', 
        default='localhost',
        help='OpenSearch host (default: localhost)'
    )
    
    parser.add_argument(
        '--port', 
        type=int, 
        default=9200,
        help='OpenSearch port (default: 9200)'
    )
    
    parser.add_argument(
        '--username', 
        default='admin',
        help='OpenSearch username (default: admin)'
    )
    
    parser.add_argument(
        '--password', 
        default='MyStrongPassword123!',
        help='OpenSearch password (default: MyStrongPassword123!)'
    )
    
    parser.add_argument(
        '--no-create-index', 
        action='store_true',
        help='Do not create index if it does not exist'
    )
    
    parser.add_argument(
        '--force-recreate', 
        action='store_true',
        help='Delete and recreate index if it exists'
    )
    
    parser.add_argument(
        '--dry-run', 
        action='store_true',
        help='Show what would be uploaded without actually uploading'
    )
    
    args = parser.parse_args()
    
    # Validate embeddings directory
    if not os.path.exists(args.embeddings_dir):
        print(f"✗ Embeddings directory not found: {args.embeddings_dir}")
        return False
    
    # Dry run mode
    if args.dry_run:
        print("=== DRY RUN MODE ===")
        print(f"Would upload from: {args.embeddings_dir}")
        print(f"Would upload to: {args.host}:{args.port}/{args.index}")
        
        data = load_embedding_files(args.embeddings_dir)
        if data:
            total_items = sum(
                sum(len(items) for items in doc_data.values()) 
                for doc_data in data.values()
            )
            print(f"Would upload {total_items} embedding items")
        return True
    
    # Actual upload
    print("=== OpenSearch Embeddings Upload ===")
    print(f"Source: {args.embeddings_dir}")
    print(f"Target: {args.host}:{args.port}/{args.index}")
    print("-" * 40)
    
    success = upload_embeddings_to_opensearch(
        embeddings_dir=args.embeddings_dir,
        index_name=args.index,
        host=args.host,
        port=args.port,
        username=args.username,
        password=args.password,
        create_index=not args.no_create_index,
        force_recreate=args.force_recreate
    )
    
    if success:
        print("\n✓ Upload completed successfully!")
        return True
    else:
        print("\n✗ Upload failed!")
        return False


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)