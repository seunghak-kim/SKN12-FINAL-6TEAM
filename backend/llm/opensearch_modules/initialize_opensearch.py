import os
import time
import logging
import sys
from opensearch_client import OpenSearchEmbeddingClient
from opensearch_config import ConfigManager

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger("OpenSearchInit")

def wait_for_opensearch(client, max_retries=30, interval=5):
    """Wait for OpenSearch to be ready."""
    logger.info(f"Waiting for OpenSearch at {client.config.opensearch.host}:{client.config.opensearch.port}...")
    
    for i in range(max_retries):
        try:
            if client.client.ping():
                logger.info("OpenSearch is ready!")
                return True
        except Exception as e:
            logger.debug(f"Connection attempt {i+1}/{max_retries} failed: {e}")
        
        time.sleep(interval)
    
    logger.error("Timeout waiting for OpenSearch.")
    return False

def main():
    logger.info("Starting OpenSearch initialization...")
    
    # Load configuration from environment variables
    config = ConfigManager()
    
    # Initialize client
    # Note: We pass config values explicitly as the client currently takes individual args
    # Ideally, update client to accept config object, but for now we stick to existing API
    # Initialize client
    # We will initialize the client AFTER waiting for OpenSearch to be ready
    # to avoid ConnectionRefusedError during startup.


    # Wait for OpenSearch to be available
    # We need to access the underlying OpenSearchConnection or just try a simple operation
    # The OpenSearchEmbeddingClient initializes connection in __init__, so we might need to handle that
    # actually OpenSearchEmbeddingClient.__init__ calls self.client.info() which might raise if not ready.
    # So we should probably wrap the client creation in a retry loop or handle it differently.
    # However, the current client implementation raises exception immediately if connection fails.
    # Let's modify the approach to be more robust for Docker startup.
    
    # Re-implementing a simple wait loop before instantiating the full client
    # because the full client loads heavy models which we don't want to do if OS is down
    from opensearchpy import OpenSearch
    
    temp_client = OpenSearch(
        hosts=[{'host': config.opensearch.host, 'port': config.opensearch.port}],
        http_auth=(config.opensearch.username, config.opensearch.password),
        use_ssl=config.opensearch.use_ssl,
        verify_certs=config.opensearch.verify_certs,
        ssl_assert_hostname=config.opensearch.ssl_assert_hostname,
        ssl_show_warn=config.opensearch.ssl_show_warn,
        timeout=5
    )
    
    logger.info(f"Waiting for OpenSearch at {config.opensearch.host}:{config.opensearch.port}...")
    ready = False
    for i in range(60): # Wait up to 5 minutes
        try:
            if temp_client.ping():
                ready = True
                logger.info("OpenSearch is ready!")
                break
        except Exception:
            pass
        time.sleep(5)
        
    if not ready:
        logger.error("OpenSearch is not available. Exiting.")
        sys.exit(1)

    # Now initialize the full client (loads models)
    logger.info("Initializing Embedding Client (loading models)...")
    client = OpenSearchEmbeddingClient(
        host=config.opensearch.host,
        port=config.opensearch.port,
        username=config.opensearch.username,
        password=config.opensearch.password,
        model_name=config.embedding.model_name,
        reranker_model=config.embedding.reranker_model
    )
    
    index_name = config.index.default_index_name
    
    # Create Index
    logger.info(f"Creating index: {index_name}")
    client.create_embedding_index(index_name)
    
    # Index Data
    embeddings_dir = config.index.embeddings_dir
    if os.path.exists(embeddings_dir):
        logger.info(f"Indexing data from: {embeddings_dir}")
        client.index_embedding_data(index_name, embeddings_dir)
    else:
        logger.warning(f"Embeddings directory not found: {embeddings_dir}")
        
    # Verify
    stats = client.get_index_stats(index_name)
    if stats:
        logger.info(f"Initialization Complete. Total Docs: {stats['total_docs']}")
    else:
        logger.error("Failed to get index stats.")

if __name__ == "__main__":
    main()
