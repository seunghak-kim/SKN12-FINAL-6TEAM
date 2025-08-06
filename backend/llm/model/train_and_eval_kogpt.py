import os
import pandas as pd
from datasets import Dataset
from evaluate import load
from sklearn.metrics import f1_score, accuracy_score, precision_score, recall_score
from transformers import AutoTokenizer, GPT2ForSequenceClassification, Trainer, TrainingArguments, EarlyStoppingCallback
from sklearn.model_selection import train_test_split, StratifiedKFold
import torch
import json
import numpy as np
from tqdm import tqdm

# 현재 파일 기준으로 상위 두 단계 위의 data 폴더 경로를 지정
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_PATH = os.path.join(BASE_DIR, "../../data/personality_keywords_dataset_v2.json")

def train_model():
    # JSON 파일 읽기 
    with open(DATA_PATH, 'r', encoding='utf-8') as f:
        data = json.load(f)
    df = pd.DataFrame(data)  # columns=["text", "label"]

    # label을 숫자 인덱스로 변환
    label2id = {"추진형": 0, "내면형": 1, "안정형": 2, "관계형": 3, "쾌락형": 4}
    id2label = {v: k for k, v in label2id.items()}
    df["label_id"] = df["label"].map(label2id)

    # Trainer가 'label' 컬럼을 자동으로 사용하므로, label_id를 label로 복사
    # (문자형 label 컬럼을 숫자로 덮어씀)
    df["label"] = df["label_id"]

    # 2. 클래스 불균형 확인 (선택)
    print(df['label'].value_counts())

    # 3. 학습/평가 데이터 분리 (8:2) - 더 엄격한 검증을 위해 test_size 증가
    train_df, eval_df = train_test_split(df, test_size=0.3, stratify=df['label'], random_state=42)
    
    # 데이터 분포 확인
    print("전체 데이터 분포:")
    print(df['label'].value_counts())
    print("\n학습 데이터 분포:")
    print(train_df['label'].value_counts())
    print("\n평가 데이터 분포:")
    print(eval_df['label'].value_counts())
    train_dataset = Dataset.from_pandas(train_df)
    eval_dataset = Dataset.from_pandas(eval_df)

    # 4. 토크나이저 및 데이터 전처리
    KOGPT_MODEL = "skt/kogpt2-base-v2"
    tokenizer = AutoTokenizer.from_pretrained(KOGPT_MODEL)
    
    # GPT 모델은 pad_token이 없으므로 추가
    if tokenizer.pad_token is None:
        tokenizer.pad_token = tokenizer.eos_token

    def preprocess(example):
        return tokenizer(example["text"], truncation=True, padding="max_length", max_length=128)

    train_dataset = train_dataset.map(preprocess, batched=True)
    eval_dataset = eval_dataset.map(preprocess, batched=True)

    # 5. koGPT 분류 모델 준비
    model = GPT2ForSequenceClassification.from_pretrained(KOGPT_MODEL, num_labels=5)
    
    # GPT2는 pad_token_id가 없으므로 설정
    if model.config.pad_token_id is None:
        model.config.pad_token_id = tokenizer.pad_token_id

    # 6. Trainer 설정
    training_args = TrainingArguments(
        output_dir=os.path.join(BASE_DIR, "kogpt_model"),
        per_device_train_batch_size=8,
        per_device_eval_batch_size=16,
        num_train_epochs=15,
        learning_rate=5e-5,  # GPT는 일반적으로 더 높은 학습률 사용
        weight_decay=0.01,
        warmup_steps=100,
        evaluation_strategy="epoch",
        save_strategy="epoch",
        logging_dir=os.path.join(BASE_DIR, "logs"),
        load_best_model_at_end=True,
        metric_for_best_model="macro_f1",
        greater_is_better=True,
        logging_steps=10,  # 더 자주 로깅
        save_total_limit=3,
        report_to=None,  # wandb 등 비활성화
        disable_tqdm=False,  # tqdm 활성화
    )

    # 7. 평가 지표 정의
    accuracy_metric = load("accuracy")
    precision_metric = load("precision")
    recall_metric = load("recall")
    f1_metric = load("f1")

    def compute_metrics(eval_pred):
        logits, labels = eval_pred
        preds = logits.argmax(axis=-1)
        acc = accuracy_metric.compute(predictions=preds, references=labels)["accuracy"]
        prec = precision_metric.compute(predictions=preds, references=labels, average="macro")["precision"]
        rec = recall_metric.compute(predictions=preds, references=labels, average="macro")["recall"]
        macro_f1 = f1_metric.compute(predictions=preds, references=labels, average="macro")["f1"]
        return {
            "accuracy": acc,
            "precision": prec,
            "recall": rec,
            "macro_f1": macro_f1
        }

    # 8. Trainer 객체 생성 및 학습
    trainer = Trainer(
        model=model,
        args=training_args,
        train_dataset=train_dataset,
        eval_dataset=eval_dataset,
        compute_metrics=compute_metrics,
        callbacks=[EarlyStoppingCallback(early_stopping_patience=3)]
    )

    # 학습 시작 정보 출력
    print(f"\n{'='*60}")
    print(f"koGPT 모델 학습 시작")
    print(f"{'='*60}")
    print("학습 진행 중...")
    
    # 학습 시작
    trainer.train()
    
    print(f"\n{'='*60}")
    print(f"학습 완료!")
    print(f"{'='*60}")

    # 9. 평가
    eval_result = trainer.evaluate()
    loss = eval_result.get("eval_loss", None)
    acc = eval_result.get("eval_accuracy", None)
    prec = eval_result.get("eval_precision", None)
    rec = eval_result.get("eval_recall", None)
    f1 = eval_result.get("eval_macro_f1", None)

    # 10. 모델 저장
    model_save_path = os.path.join(BASE_DIR, "kogpt_model")
    model.save_pretrained(model_save_path)
    tokenizer.save_pretrained(model_save_path)
    
    # 평가 결과를 파일에 저장
    eval_metrics = {
        "loss": loss,
        "accuracy": acc,
        "precision": prec,
        "recall": rec,
        "macro_f1": f1
    }
    with open(os.path.join(model_save_path, "eval_metrics.json"), "w", encoding="utf-8") as f:
        json.dump(eval_metrics, f, ensure_ascii=False, indent=2)

def cross_validate_model(k_folds=5):
    """
    K-Fold 교차 검증으로 모델 성능을 더 정확히 측정
    """
    # 데이터 로드
    with open(DATA_PATH, 'r', encoding='utf-8') as f:
        data = json.load(f)
    df = pd.DataFrame(data)
    
    # 라벨 변환
    label2id = {"추진형": 0, "내면형": 1, "안정형": 2, "관계형": 3, "쾌락형": 4}
    df["label"] = df["label"].map(label2id)
    
    # K-Fold 교차 검증
    skf = StratifiedKFold(n_splits=k_folds, shuffle=True, random_state=42)
    
    # 결과 저장
    cv_results = {
        'accuracy': [],
        'precision': [],
        'recall': [],
        'f1': []
    }
    
    print(f"{k_folds}-Fold 교차 검증 시작...")
    
    for fold, (train_idx, val_idx) in enumerate(skf.split(df, df['label'])):
        print(f"\nFold {fold + 1}/{k_folds}")
        
        # 데이터 분할
        train_df = df.iloc[train_idx].reset_index(drop=True)
        val_df = df.iloc[val_idx].reset_index(drop=True)
        
        # 데이터셋 생성
        train_dataset = Dataset.from_pandas(train_df)
        val_dataset = Dataset.from_pandas(val_df)
        
        # 토크나이저
        KOGPT_MODEL = "skt/kogpt2-base-v2"
        tokenizer = AutoTokenizer.from_pretrained(KOGPT_MODEL)
        
        # GPT 모델은 pad_token이 없으므로 추가
        if tokenizer.pad_token is None:
            tokenizer.pad_token = tokenizer.eos_token
        
        def preprocess(example):
            return tokenizer(example["text"], truncation=True, padding="max_length", max_length=128)
        
        train_dataset = train_dataset.map(preprocess, batched=True)
        val_dataset = val_dataset.map(preprocess, batched=True)
        
        # 모델 생성
        model = GPT2ForSequenceClassification.from_pretrained(KOGPT_MODEL, num_labels=5)
        
        # GPT2는 pad_token_id가 없으므로 설정
        if model.config.pad_token_id is None:
            model.config.pad_token_id = tokenizer.pad_token_id
        
        # 학습 설정
        training_args = TrainingArguments(
            output_dir=f"./kogpt_model_fold_{fold}",
            per_device_train_batch_size=8,
            per_device_eval_batch_size=16,
            num_train_epochs=3,  # 교차 검증이므로 에폭 수 줄임
            learning_rate=5e-5,
            weight_decay=0.01,
            warmup_steps=100,
            evaluation_strategy="epoch",
            save_strategy="no",  # 저장 안함
            logging_dir=f"./logs_fold_{fold}",
            load_best_model_at_end=True,
            metric_for_best_model="eval_loss",
            logging_steps=50,
        )
        
        # 평가 함수
        def compute_metrics(eval_pred):
            logits, labels = eval_pred
            preds = logits.argmax(axis=-1)
            
            accuracy = accuracy_score(labels, preds)
            precision = precision_score(labels, preds, average='macro')
            recall = recall_score(labels, preds, average='macro')
            f1 = f1_score(labels, preds, average='macro')
            
            return {
                "accuracy": accuracy,
                "precision": precision,
                "recall": recall,
                "f1": f1
            }
        
        # 트레이너 생성
        trainer = Trainer(
            model=model,
            args=training_args,
            train_dataset=train_dataset,
            eval_dataset=val_dataset,
            compute_metrics=compute_metrics,
        )
        
        # 학습
        trainer.train()
        
        # 평가
        eval_results = trainer.evaluate()
        
        # 결과 저장
        cv_results['accuracy'].append(eval_results['eval_accuracy'])
        cv_results['precision'].append(eval_results['eval_precision'])
        cv_results['recall'].append(eval_results['eval_recall'])
        cv_results['f1'].append(eval_results['eval_f1'])
        
        print(f"  Accuracy: {eval_results['eval_accuracy']:.4f}")
        print(f"  Precision: {eval_results['eval_precision']:.4f}")
        print(f"  Recall: {eval_results['eval_recall']:.4f}")
        print(f"  F1: {eval_results['eval_f1']:.4f}")
    
    # 최종 결과 계산
    print(f"\n{'='*50}")
    print(f"{k_folds}-Fold 교차 검증 결과")
    print(f"{'='*50}")
    
    for metric_name, scores in cv_results.items():
        mean_score = np.mean(scores)
        std_score = np.std(scores)
        print(f"{metric_name.capitalize()}: {mean_score:.4f} (±{std_score:.4f})")
    
    # 결과 저장
    with open("cross_validation_results_kogpt.json", "w", encoding="utf-8") as f:
        json.dump(cv_results, f, ensure_ascii=False, indent=2)
    
    return cv_results

# 11. 예측 함수 예시
def predict_persona(text, model_dir=None):
    if model_dir is None:
        model_dir = os.path.join(BASE_DIR, "kogpt_model")
    tokenizer = AutoTokenizer.from_pretrained(model_dir)
    model = GPT2ForSequenceClassification.from_pretrained(model_dir)
    model.eval()
    
    # GPT 모델은 pad_token이 없으므로 추가
    if tokenizer.pad_token is None:
        tokenizer.pad_token = tokenizer.eos_token
    
    inputs = tokenizer(text, return_tensors="pt", truncation=True, padding="max_length", max_length=128)
    
    with torch.no_grad():
        outputs = model(**inputs)
        pred = torch.argmax(outputs.logits, dim=1).item()
    id2label = {0: "추진형", 1: "내면형", 2: "안정형", 3: "관계형", 4: "쾌락형"}
    return id2label[pred]

def get_raw_text_from_result_json(result_json_path):
    with open(result_json_path, encoding="utf-8") as f:
        result = json.load(f)
    return result.get("raw_text", "")

def run_persona_prediction_from_result(image_base, quiet=True):
    result_json_path = os.path.join(BASE_DIR, f"../detection_results/results/result_{image_base}.json")
    test_text = get_raw_text_from_result_json(result_json_path)
    
    # 모델 경로 설정
    model_path = os.path.join(BASE_DIR, "kogpt_model")
    eval_metrics_path = os.path.join(model_path, "eval_metrics.json")
    
    # 저장된 평가 결과가 있으면 출력
    if os.path.exists(eval_metrics_path):
        with open(eval_metrics_path, "r", encoding="utf-8") as f:
            eval_metrics = json.load(f)
        
        print("\n [최종 평가 결과]")
        if eval_metrics.get("loss") is not None:
            print(f"Loss: {eval_metrics['loss']:.4f}")
        if eval_metrics.get("accuracy") is not None:
            print(f"Accuracy: {eval_metrics['accuracy']:.4f}")
        if eval_metrics.get("precision") is not None:
            print(f"Precision: {eval_metrics['precision']:.4f}")
        if eval_metrics.get("recall") is not None:
            print(f"Recall: {eval_metrics['recall']:.4f}")
        if eval_metrics.get("macro_f1") is not None:
            print(f"Macro F1 Score: {eval_metrics['macro_f1']:.4f}")
    
    persona = predict_persona(test_text)
    print(f"\n[예측 결과] : 당신의 유형은 {persona}입니다.")

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="koGPT 기반 감정 유형 분류 실행")
    parser.add_argument('--image', type=str, default="test5", help='분석할 원본 이미지 파일명 (예: test5.jpg 또는 test5)')
    parser.add_argument('--train', action='store_true', help='모델 학습 실행')
    parser.add_argument('--cv', action='store_true', help='교차 검증 실행')
    args = parser.parse_args()
    
    if args.train:
        train_model()
    elif args.cv:
        cross_validate_model(k_folds=5)
    else:
        image_base = args.image
        if image_base.endswith('.jpg'):
            image_base = image_base[:-4]
        run_persona_prediction_from_result(image_base)