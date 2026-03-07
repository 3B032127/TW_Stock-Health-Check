import yfinance as yf
from pprint import pprint

ticker = yf.Ticker("2330.TW")
info = ticker.info
print("Keys available in yfinance info:")
pprint(list(info.keys()))

print("\nSpecific fields:")
print("Long Name:", info.get('longName'))
print("Sector:", info.get('sector'))
print("Industry:", info.get('industry'))
print("Full Time Employees:", info.get('fullTimeEmployees'))
print("Business Summary:", info.get('longBusinessSummary'))

# We also need Chairman, CEO, Capital, Est Date, Listing Date, Tax ID.
# Let's see if companyOfficers has them.
officers = info.get('companyOfficers', [])
for o in officers:
    print("Officer:", o.get('name'), o.get('title'))
