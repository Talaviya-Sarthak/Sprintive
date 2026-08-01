from dotenv import load_dotenv
from groq import Groq
import os

load_dotenv()

key = os.getenv("GROQ_API_KEY")

print("Key exists:", bool(key))
print("Key prefix:", key[:8] if key else None)

client = Groq(api_key=key)

try:
    models = client.models.list()
    print("✅ Groq connection successful")
    print(models)
except Exception as e:
    print("❌ Error:")
    print(type(e).__name__)
    print(e)