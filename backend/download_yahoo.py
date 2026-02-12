import requests

def download_page():
    url = "https://tw.stock.yahoo.com/class"
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
    }
    try:
        response = requests.get(url, headers=headers)
        with open("backend/yahoo_class.html", "w", encoding="utf-8") as f:
            f.write(response.text)
        print("Downloaded to backend/yahoo_class.html")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    download_page()
