import requests
from bs4 import BeautifulSoup
import json
import re

def verify_yahoo_json():
    url = "https://tw.stock.yahoo.com/s/tse.php"
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
    }

    try:
        response = requests.get(url, headers=headers)
        response.raise_for_status()
        
        soup = BeautifulSoup(response.text, 'html.parser')
        
        # Find the script tag containing "root.App.main"
        script_tags = soup.find_all('script')
        for script in script_tags:
            if script.string and "root.App.main" in script.string:
                # Improved extraction logic
                try:
                    start_marker = "root.App.main ="
                    start_index = script.string.find(start_marker)
                    if start_index != -1:
                        # Move past the marker
                        json_start = script.string.find("{", start_index)
                        if json_start != -1:
                            # We need to find the matching closing brace
                            # This is tricky with regex, so let's try to find the end of the assignment
                            # Usually it ends with ";\n" or ";(function"
                            # Let's try to find the next ";" that is not inside a string
                            
                            # Simple approach: assume it's valid JSON ending with };
                            # Find the last };
                            json_end = script.string.rfind("};")
                            if json_end != -1:
                                json_str = script.string[json_start:json_end+1]
                                
                                # Sanitize common JS-only values
                                json_str = json_str.replace("undefined", "null")
                                
                                try:
                                    data = json.loads(json_str)
                                    
                                    quote_data = data.get('context', {}).get('dispatcher', {}).get('stores', {}).get('QuoteFundamental', {}).get('quote', {}).get('data', {})
                                    
                                    turnover_m = quote_data.get('turnoverM')
                                    volume = quote_data.get('volume')
                                    
                                    print(f"TurnoverM: {turnover_m}")
                                    print(f"Volume: {volume}")
                                    
                                    if turnover_m:
                                        print(f"Turnover (Calc): {float(turnover_m)/100:.2f} 億")
                                        
                                    return
                                except json.JSONDecodeError as je:
                                    print(f"JSON Decode Error: {je}")
                                    print(f"Error location: {je.pos}")
                                    print(f"Context around error: {json_str[max(0, je.pos-50):min(len(json_str), je.pos+50)]}")
                except Exception as e:
                    print(f"Extraction error: {e}")
        
        print("Could not find data in script tags.")

    except Exception as e:
        print(f"Error scraping Yahoo Finance: {e}")

if __name__ == "__main__":
    verify_yahoo_json()
