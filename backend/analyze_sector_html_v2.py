import requests
from bs4 import BeautifulSoup

def analyze_sector_table():
    url = "https://tw.stock.yahoo.com/class"
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
    }
    
    try:
        response = requests.get(url, headers=headers)
        response.encoding = 'utf-8'
        soup = BeautifulSoup(response.text, 'html.parser')
        
        print("Searching for table headers...")
        
        # Method 1: Look for specific header text
        keywords = ["類股", "漲跌幅", "成交值", "成交量", "漲跌"]
        found_headers = []
        
        for kw in keywords:
            elements = soup.find_all(string=lambda text: text and kw in text)
            for el in elements:
                # Check if it's likely a header (e.g., inside a div with specific class or role)
                parent = el.parent
                # print(f"Found '{kw}': {parent.name} Class: {parent.get('class')}")
                found_headers.append(parent)

        if not found_headers:
            print("No headers found.")
            return

        # Method 2: Inspect a likely header row
        # Usually headers are grouped. Let's find a container that has multiple of these.
        
        # Let's try to find a row that contains "漲跌幅"
        header_el = soup.find(string="漲跌幅")
        if header_el:
            print("\n--- Header Row Analysis ---")
            header_cell = header_el.parent
            header_row = header_cell.parent
            print(f"Header Cell: {header_cell.name} {header_cell.get('class')}")
            print(f"Header Row: {header_row.name} {header_row.get('class')}")
            
            # Print all siblings in the header row
            print("Header Columns:")
            for child in header_row.children:
                if child.name:
                    print(f"  {child.get_text(strip=True)}")
            
            # Now try to find the data rows. Usually they are siblings of the header row's parent, 
            # or the header row is in a 'thead' and data in 'tbody'.
            
            # Check structure
            table_container = header_row.parent
            print(f"\nTable/List Container: {table_container.name} {table_container.get('class')}")
            
            # If it's a div list (Yahoo often uses specific div structures)
            # Find sibling rows
            data_rows = []
            for sibling in header_row.next_siblings:
                if sibling.name:
                    data_rows.append(sibling)
                    if len(data_rows) >= 3: break # Just get first 3
            
            if not data_rows and table_container.next_sibling:
                 # Maybe header is separate from body
                 body = table_container.next_sibling
                 print(f"Possible Body: {body.name} {body.get('class')}")
                 for child in body.children:
                     if child.name:
                         data_rows.append(child)
                         if len(data_rows) >= 3: break

            print(f"\n--- Sample Data Rows ({len(data_rows)}) ---")
            for i, row in enumerate(data_rows):
                print(f"Row {i+1}:")
                # print(row.prettify()[:200]) # Print start of html
                text = row.get_text(strip=True, separator='|')
                print(f"  Text: {text}")
                
        else:
            print("Could not find '漲跌幅' header.")

    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    analyze_sector_table()
