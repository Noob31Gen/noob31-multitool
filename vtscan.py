import argparse
import requests
import json
import time
import sys
import base64
from datetime import datetime, timezone

def encode_url_id(url):
    """Encodes the URL to the base64url format required by VT v3 API."""
    return base64.urlsafe_b64encode(url.encode()).decode().strip("=")

def format_timestamp(epoch):
    """Converts VT's Unix epoch timestamps to human-readable UTC strings."""
    if not epoch:
        return "N/A"
    return datetime.fromtimestamp(epoch, timezone.utc).strftime('%Y-%m-%d %H:%M:%S UTC')

def submit_url(api_key, url):
    """Submits the URL to VirusTotal and returns the analysis ID."""
    print(f"[*] Submitting {url} for a fresh scan...")
    endpoint = "https://www.virustotal.com/api/v3/urls"
    headers = {
        "accept": "application/json",
        "x-apikey": api_key,
        "content-type": "application/x-www-form-urlencoded"
    }
    payload = {"url": url}
    
    response = requests.post(endpoint, headers=headers, data=payload)
    
    if response.status_code == 200:
        return response.json()["data"]["id"]
    else:
        print(f"[!] Error submitting URL. HTTP {response.status_code}")
        print(response.text)
        sys.exit(1)

def get_analysis_report(api_key, analysis_id):
    """Polls the analysis ID until the scan is complete and returns the report."""
    print(f"[*] Waiting for scan to complete (ID: {analysis_id})...")
    endpoint = f"https://www.virustotal.com/api/v3/analyses/{analysis_id}"
    headers = {
        "accept": "application/json",
        "x-apikey": api_key
    }
    
    while True:
        response = requests.get(endpoint, headers=headers)
        
        if response.status_code != 200:
            print(f"[!] Error retrieving report. HTTP {response.status_code}")
            print(response.text)
            sys.exit(1)
            
        data = response.json()
        status = data["data"]["attributes"]["status"]
        
        if status == "completed":
            print("[+] Scan completed.")
            return data
        
        # 15 seconds keeps you safer from the Free Tier 4-req/min rate limit
        print("[-] Scan in progress. Waiting 15 seconds...")
        time.sleep(15)

def get_url_details(api_key, url_id):
    """Fetches the detailed URL object from VirusTotal."""
    print("[*] Fetching deep URL details from database...")
    endpoint = f"https://www.virustotal.com/api/v3/urls/{url_id}"
    headers = {
        "accept": "application/json",
        "x-apikey": api_key
    }
    
    response = requests.get(endpoint, headers=headers)
    if response.status_code == 200:
        return response.json()
    else:
        print(f"[!] Error retrieving URL details. HTTP {response.status_code}")
        print(response.text)
        sys.exit(1)

def parse_detections(scan_data):
    """Extracts the scan stats and individual engine verdicts."""
    attr = scan_data.get("data", {}).get("attributes", {})
    stats = attr.get("stats", {})
    results = attr.get("results", {})
    
    # Filter for engines that actually flagged something to keep output clean
    flagged_by = {engine: data["result"] for engine, data in results.items() if data["category"] in ["malicious", "suspicious"]}
    
    return {
        "Summary": stats,
        "Flagged By": flagged_by if flagged_by else "Clean by all engines"
    }

def parse_details_tab(raw_data):
    """Extracts and formats the data shown in the VT GUI 'Details' tab."""
    attr = raw_data.get("data", {}).get("attributes", {})
    
    details = {
        "Categories": attr.get("categories", {}),
        "History": {
            "First Submission": format_timestamp(attr.get("first_submission_date")),
            "Last Submission": format_timestamp(attr.get("last_submission_date")),
            "Last Analysis": format_timestamp(attr.get("last_analysis_date"))
        },
        "HTTP Response": {
            "Final URL": attr.get("last_final_url", "N/A"),
            "Status Code": attr.get("last_http_response_code", "N/A"),
            "Body Length": attr.get("last_http_response_content_length", "N/A"),
            "Body SHA256": attr.get("last_http_response_content_sha256", "N/A"),
            "Headers": attr.get("last_http_response_headers", {})
        },
        "HTML Info": {
            "Title": attr.get("html_meta", {}).get("title", ["N/A"])[0] if isinstance(attr.get("html_meta", {}).get("title"), list) else "N/A",
            "Meta Tags": attr.get("html_meta", {})
        },
        "Trackers": attr.get("trackers", {}),
        "Network Routing": {
            "Redirection Chain": attr.get("redirection_chain", []),
            "Outgoing Links": attr.get("outgoing_links", [])
        }
    }
    return details

def main():
    parser = argparse.ArgumentParser(description="VirusTotal Full Scanner (Detections + Details)")
    parser.add_argument("-k", "--key", required=True, help="VirusTotal API Key")
    parser.add_argument("-u", "--url", required=True, help="Target URL")
    parser.add_argument("-o", "--output", default="vt_full_report.json", help="Output JSON filename")
    
    args = parser.parse_args()
    
    # 1. Force active scan and get verdicts
    analysis_id = submit_url(args.key, args.url)
    scan_data = get_analysis_report(args.key, analysis_id)
    
    # 2. Get the updated deep details from the database
    url_id = encode_url_id(args.url)
    details_data = get_url_details(args.key, url_id)
    
    # 3. Parse both payloads
    parsed_detections = parse_detections(scan_data)
    parsed_details = parse_details_tab(details_data)
    
    # 4. Combine into final output
    final_output = {
        "Target URL": args.url,
        "Detection Summary": parsed_detections,
        "Deep Details": parsed_details
    }
    
    try:
        with open(args.output, "w", encoding="utf-8") as f:
            json.dump(final_output, f, indent=4, ensure_ascii=False)
        print(f"[+] Full report cleanly parsed and saved to: {args.output}")
    except IOError as e:
        print(f"[!] Failed to write to {args.output}: {e}")

if __name__ == "__main__":
    main()