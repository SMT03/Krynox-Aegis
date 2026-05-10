import json
from solders.keypair import Keypair
try:
    with open('/home/symtuh/.config/solana/id.json', 'r') as f:
        data = json.load(f)
    kp = Keypair.from_bytes(bytes(data))
    print(kp.pubkey())
except Exception as e:
    print("Error:", e)
