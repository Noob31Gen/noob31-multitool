import requests
import json
import time

# Configuration
TEST_ASN = "AS15169"  # Google
TEST_IP = "8.8.8.8"    # Google DNS
OUTPUT_FILE = "asn_ip_test_results.json"

# We test both because some APIs return different levels of detail
ENDPOINTS = {
    "RIPEstat_ASN_Overview": f"https://stat.ripe.net/data/as-overview/data.json?resource={TEST_ASN}",
    "RIPEstat_IP_Overview": f"https://stat.ripe.net/data/as-overview/data.json?resource={TEST_IP}",
    "IPAPI_ASN": f"https://api.ipapi.is/?q={TEST_ASN}",
    "IPAPI_IP": f"https://api.ipapi.is/?q={TEST_IP}",
    "PeeringDB_ASN": f"https://www.peeringdb.com/api/net?asn={TEST_ASN.replace('AS', '')}"
}

def test_apis():
    results = {
        "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
        "targets": {"asn": TEST_ASN, "ip": TEST_IP},
        "api_responses": {}
    }

    print(f"Starting combined tests for {TEST_ASN} and {TEST_IP}...")

    for name, url in ENDPOINTS.items():
        try:
            print(f"Querying {name}...")
            # Using a real-looking User-Agent to avoid simple bot blocks
            headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Cybersecurity-Tool-Test'}
            response = requests.get(url, headers=headers, timeout=10)
            
            if response.status_code == 200:
                results["api_responses"][name] = {
                    "status": "SUCCESS",
                    "data": response.json()
                }
            else:
                results["api_responses"][name] = {
                    "status": f"ERROR_{response.status_code}",
                    "data": response.text[:200]
                }
        except Exception as e:
            results["api_responses"][name] = {
                "status": "EXCEPTION",
                "message": str(e)
            }
        
        time.sleep(1.2) # Slightly longer delay to be safe

    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(results, f, indent=4)
    
    print(f"\nResults written to {OUTPUT_FILE}")

if __name__ == "__main__":
    test_apis()