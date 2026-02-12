from bs4 import BeautifulSoup

def inspect_local():
    try:
        with open("backend/yahoo_class.html", "r", encoding="utf-8") as f:
            html = f.read()
            
        soup = BeautifulSoup(html, 'html.parser')
        
        # Find the element containing "半導體"
        target = soup.find(string="半導體")
        if target:
            parent = target.parent # a tag
            row = parent.parent # li tag? or div?
            
            # Walk up until we hit a likely row container (li or div with broad structure)
            # Based on previous output: Parent (li): classes=['D(f)', 'Ai(c)', 'W(100%)', 'Mt(12px)']
            
            curr = parent
            while curr and curr.name != 'li':
                curr = curr.parent
            
            if curr:
                print(f"Found Row: {curr.name} Class: {curr.get('class')}")
                print("--- Row Text Content ---")
                # Print text with separator to see columns
                print(curr.get_text(separator=' | ', strip=True))
                
                print("\n--- Row Children ---")
                for child in curr.children:
                    if child.name:
                        print(f"Tag: {child.name} Class: {child.get('class')} Text: {child.get_text(strip=True)[:50]}")
                        
                # Also try to find a sibling row to compare
                print("\n--- Sibling Row ---")
                sibling = curr.find_next_sibling('li')
                if sibling:
                    print(sibling.get_text(separator=' | ', strip=True))
            else:
                print("Could not find 'li' parent for substitute.")
                
        else:
            print("Could not find '半導體' in local file.")

    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    inspect_local()
