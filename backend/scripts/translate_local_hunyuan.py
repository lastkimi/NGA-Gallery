import os
import torch
from transformers import AutoModelForCausalLM, AutoTokenizer
from pymongo import MongoClient
from tqdm import tqdm
import re

# MongoDB Configuration
MONGO_URI = os.getenv('MONGO_URI', 'mongodb://localhost:27017/')
DB_NAME = 'openart'
COLLECTION_NAME = 'objects'

# Model Configuration
MODEL_NAME = "tencent/HY-MT1.5-1.8B"

def clean_text(text):
    if not text:
        return ""
    # Remove <think> tags if any (though this model might not have them, good practice)
    text = re.sub(r'<think>.*?</think>', '', text, flags=re.DOTALL)
    text = text.replace('<think>', '').replace('</think>', '')
    return text.strip()

def main():
    print(f"Connecting to MongoDB at {MONGO_URI}...")
    try:
        client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=5000)
        db = client[DB_NAME]
        collection = db[COLLECTION_NAME]
        # Test connection
        client.server_info()
        print("✅ Connected to MongoDB")
    except Exception as e:
        print(f"❌ Failed to connect to MongoDB: {e}")
        return

    print(f"Loading model {MODEL_NAME}...")
    try:
        tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME, trust_remote_code=True)
        # Check for MPS (Apple Silicon) or CUDA
        device = "cuda" if torch.cuda.is_available() else "mps" if torch.backends.mps.is_available() else "cpu"
        print(f"Using device: {device}")
        
        model = AutoModelForCausalLM.from_pretrained(
            MODEL_NAME, 
            torch_dtype=torch.float16 if device != "cpu" else torch.float32, 
            device_map="auto" if device != "cpu" else None,
            trust_remote_code=True
        )
        if device == "mps" and not getattr(model, "is_loaded_in_8bit", False):
             model.to(device)
             
        print("✅ Model loaded")
    except Exception as e:
        print(f"❌ Failed to load model: {e}")
        return

    # Fields to translate
    fields_to_translate = ['title', 'attribution', 'medium', 'provenance', 'credit_line', 'display_date']
    
    # Fetch all objects
    total_docs = collection.count_documents({})
    print(f"Found {total_docs} documents. Starting translation...")
    
    cursor = collection.find({}, {'object_id': 1, 'title': 1, 'attribution': 1, 'medium': 1, 'provenance': 1, 'credit_line': 1, 'display_date': 1, 'translations': 1})
    
    for doc in tqdm(cursor, total=total_docs):
        updates = {}
        has_updates = False
        
        # Prepare translation tasks
        for field in fields_to_translate:
            original_text = doc.get(field)
            if original_text and isinstance(original_text, str) and len(original_text.strip()) > 0:
                # Check if it looks like English (basic heuristic)
                if re.search(r'[a-zA-Z]', original_text):
                    
                    # Construct Prompt (Standard Chat Format for Translation)
                    # Note: HY-MT prompt format might need adjustment. 
                    # Assuming standard "Translate this to Chinese: ..."
                    prompt = f"将以下英文翻译成中文：\n{original_text}"
                    
                    inputs = tokenizer(prompt, return_tensors="pt").to(device)
                    
                    try:
                        with torch.no_grad():
                            generated_ids = model.generate(
                                **inputs, 
                                max_new_tokens=512,
                                temperature=0.3,
                                do_sample=True
                            )
                        output = tokenizer.decode(generated_ids[0], skip_special_tokens=True)
                        
                        # Extract translation (remove prompt)
                        translation = output.replace(prompt, '').strip()
                        translation = clean_text(translation)
                        
                        if translation:
                            updates[field] = translation
                            has_updates = True
                    except Exception as e:
                        # print(f"Translation failed for {doc.get('object_id')}: {e}")
                        pass
        
        if has_updates:
            # Update MongoDB
            try:
                # Check existing translations
                existing_trans = doc.get('translations', [])
                zh_index = -1
                for i, t in enumerate(existing_trans):
                    if t.get('locale') == 'zh':
                        zh_index = i
                        break
                
                updates['locale'] = 'zh'
                
                if zh_index > -1:
                    # Update existing
                    update_query = {
                        '$set': {
                            f'translations.{zh_index}.{k}': v for k, v in updates.items() if k != 'locale'
                        }
                    }
                    # Also update timestamp
                    update_query['$set']['updated_at'] = datetime.datetime.now()
                    collection.update_one({'_id': doc['_id']}, update_query)
                else:
                    # Push new
                    collection.update_one(
                        {'_id': doc['_id']},
                        {
                            '$push': {'translations': updates},
                            '$set': {'updated_at': datetime.datetime.now()}
                        }
                    )
            except Exception as e:
                print(f"DB Update failed: {e}")

    print("Done!")

if __name__ == "__main__":
    import datetime
    main()
