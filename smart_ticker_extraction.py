import pandas as pd
import re
from collections import Counter, defaultdict
import warnings
warnings.filterwarnings('ignore')

print('SMART TICKER EXTRACTION (Pattern-Based)\n')
print('Using advanced pattern matching and context analysis')
print('No predefined company-to-ticker mappings required\n')

# Load the dataframe
df = pd.read_pickle('financial_news_df.pkl')


class SmartTickerExtractor:
    """
    Advanced ticker extraction using pattern matching, context analysis,
    and dynamic learning - no predefined mappings required
    """

    def __init__(self):
        # Dynamic cache built during processing
        self.company_ticker_cache = {}

        # Ticker extraction patterns (pattern, group_index, confidence_score)
        self.patterns = [
            # Highest confidence patterns
            (r'\$([A-Z]{1,5})\b', 1, 10.0),  # $AAPL
            (r'(?:NYSE|NASDAQ|LSE|TSE):\s*([A-Z]{1,5})\b', 1, 10.0),  # NYSE: AAPL
            (r'\((?:NYSE|NASDAQ|LSE|TSE):\s*([A-Z]{1,5})\)', 1, 10.0),  # (NYSE: AAPL)

            # High confidence patterns
            (r'\(([A-Z]{1,5})\)', 1, 8.0),  # (AAPL)
            (r'ticker\s+(?:symbol\s+)?([A-Z]{1,5})\b', 1, 9.0),  # ticker AAPL
            (r'trades\s+as\s+([A-Z]{1,5})\b', 1, 9.0),  # trades as AAPL
            (r'symbol\s+([A-Z]{1,5})\b', 1, 8.0),  # symbol AAPL

            # Medium confidence patterns
            (r'\b([A-Z]{1,5}):', 1, 6.0),  # AAPL:
            (r'ticker:\s*([A-Z]{1,5})\b', 1, 7.0),  # ticker: AAPL

            # International exchanges
            (r'\$([A-Z]{2,5}\.[A-Z]{1,2})\b', 1, 9.0),  # $LLOY.L
            (r'\(([A-Z]{2,5}\.[A-Z]{1,2})\)', 1, 8.0),  # (LLOY.L)
            (r'\b([A-Z]{2,5}\.[A-Z]{1,2})\b', 0, 5.0),  # LLOY.L

            # Asian exchanges (numeric tickers)
            (r'\((\d{4,5}\.[A-Z]{1,2})\)', 1, 8.0),  # (5401.T)
            (r'\b(\d{4,5}\.[A-Z]{1,2})\b', 0, 5.0),  # 5401.T
        ]

        # Common words to exclude (false positives)
        self.excluded_words = {
            'CEO', 'CFO', 'CTO', 'COO', 'IPO', 'USA', 'US', 'UK', 'EU', 'ETF', 'SEC',
            'FDA', 'FBI', 'CIA', 'NASA', 'GDP', 'AI', 'IT', 'HR', 'PR', 'OF', 'THE',
            'Q1', 'Q2', 'Q3', 'Q4', 'YTD', 'API', 'APP', 'TV', 'PC', 'AND', 'FOR',
            'COVID', 'CNBC', 'CNN', 'BBC', 'ABC', 'NBC', 'CBS', 'FOX', 'NFL', 'NBA',
            'AM', 'PM', 'EST', 'PST', 'GMT', 'UTC', 'IS', 'IN', 'ON', 'AT', 'TO',
            'LLC', 'INC', 'LTD', 'CORP', 'CO', 'GROUP', 'HOLDINGS', 'BY', 'OR', 'AS',
            'AN', 'NEW', 'OLD', 'BIG', 'TOP', 'GET', 'GOT', 'HAS', 'HAD', 'CAN', 'MAY',
            'WILL', 'NOT', 'ALL', 'BUT', 'OUT', 'UP', 'DOWN', 'NOW', 'DAY', 'WEEK',
            'YEAR', 'TIME', 'SAYS', 'SAID', 'FROM', 'INTO', 'OVER', 'ALSO', 'MORE',
            'MOST', 'SOME', 'SUCH', 'WHAT', 'WHEN', 'WHERE', 'WHO', 'WHY', 'HOW',
            'THAN', 'THAT', 'THEM', 'THEN', 'THERE', 'THESE', 'THEY', 'THIS', 'THOSE',
            'VERY', 'WELL', 'WITH', 'YOUR', 'ABOUT', 'AFTER', 'AGAIN', 'AMONG', 'BANK',
            'BE', 'BEEN', 'BEING', 'BOTH', 'CASE', 'COULD', 'DOES', 'DOING', 'DONE',
        }

        # Company name indicators
        self.company_indicators = ['Inc', 'Corp', 'Corporation', 'Ltd', 'Limited',
                                    'LLC', 'Co', 'Company', 'Group', 'Holdings',
                                    'Plc', 'PLC', 'AG', 'SA', 'NV', 'SE']

    def extract_company_ticker_pairs(self, text):
        """
        Extract explicit company-ticker pairs like 'Apple Inc. (AAPL)'
        This builds our dynamic cache
        """
        pairs = []

        # Pattern: Company Name (TICKER)
        # Matches: "Apple Inc. (AAPL)", "Tesla Motors (TSLA)", etc.
        pattern = r'([A-Z][A-Za-z\s&\'.]{2,40}?)\s*\(([A-Z]{1,5})\)'
        matches = re.findall(pattern, text)

        for company, ticker in matches:
            company = company.strip()
            ticker = ticker.strip()

            # Validate
            if ticker not in self.excluded_words and len(company) > 2:
                # Check if company ends with company indicator
                has_indicator = any(ind in company for ind in self.company_indicators)

                if has_indicator or len(ticker) <= 4:
                    pairs.append((company, ticker))
                    # Add to cache
                    self.company_ticker_cache[company.lower()] = ticker

        # Also match international format: "Company (TICKER.EX)"
        pattern_intl = r'([A-Z][A-Za-z\s&\'.]{2,40}?)\s*\(([A-Z0-9]{2,6}\.[A-Z]{1,2})\)'
        matches_intl = re.findall(pattern_intl, text)

        for company, ticker in matches_intl:
            company = company.strip()
            ticker = ticker.strip()

            if len(company) > 2:
                pairs.append((company, ticker))
                self.company_ticker_cache[company.lower()] = ticker

        return pairs

    def extract_pattern_tickers(self, text):
        """Extract tickers using regex patterns with confidence scoring"""
        ticker_scores = defaultdict(float)

        for pattern, group_idx, score in self.patterns:
            matches = re.finditer(pattern, text, re.IGNORECASE)

            for match in matches:
                ticker = match.group(group_idx if group_idx > 0 else 0)
                ticker = ticker.upper()

                # Validate ticker
                if self.is_valid_ticker(ticker):
                    ticker_scores[ticker] += score

        return ticker_scores

    def is_valid_ticker(self, ticker):
        """Validate if a string could be a valid ticker"""
        if not ticker or ticker in self.excluded_words:
            return False

        # US tickers: 1-5 uppercase letters
        if re.match(r'^[A-Z]{1,5}$', ticker):
            # Additional validation: avoid common words
            if len(ticker) <= 2:
                return True  # Very short tickers are usually valid
            return True

        # International tickers
        if re.match(r'^[A-Z0-9]{2,6}\.[A-Z]{1,2}$', ticker):
            return True

        return False

    def extract_capitalized_names(self, text):
        """Extract capitalized phrases that might be company names"""
        # Pattern: Capitalized words (2-4 words)
        pattern = r'\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,3}(?:\s+(?:Inc|Corp|Ltd|LLC|Co|Group|Holdings|Plc|PLC)\.?)?)\b'
        matches = re.findall(pattern, text)
        return matches

    def find_ticker_near_name(self, name, text, window=150):
        """Find tickers mentioned near a company name"""
        try:
            # Find position of name in text
            name_lower = name.lower()
            text_lower = text.lower()

            pos = text_lower.find(name_lower)
            if pos == -1:
                return None

            # Extract context window
            start = max(0, pos - window)
            end = min(len(text), pos + len(name) + window)
            context = text[start:end]

            # Find tickers in context
            ticker_scores = self.extract_pattern_tickers(context)

            if ticker_scores:
                # Return highest scoring ticker
                best_ticker = max(ticker_scores.items(), key=lambda x: x[1])
                return best_ticker[0]

        except Exception:
            pass

        return None

    def score_and_select_ticker(self, ticker_scores, title, full_text):
        """Select the best ticker based on all signals"""
        if not ticker_scores:
            return None

        # Boost score if ticker appears in title
        for ticker in ticker_scores.keys():
            if ticker in title:
                ticker_scores[ticker] *= 2.0

        # Boost score for standard length tickers
        for ticker in ticker_scores.keys():
            if 1 <= len(ticker) <= 4 and '.' not in ticker:
                ticker_scores[ticker] += 2.0

        # Count occurrences and boost repeated tickers
        for ticker in ticker_scores.keys():
            count = full_text.upper().count(ticker)
            if count > 1:
                ticker_scores[ticker] += count * 1.5

        # Select highest scoring ticker
        sorted_tickers = sorted(ticker_scores.items(), key=lambda x: x[1], reverse=True)
        return sorted_tickers[0][0]

    def extract_ticker(self, row):
        """Main extraction method"""
        # If ticker exists, return it
        if pd.notna(row['ticker']):
            return row['ticker']

        title = str(row['title'])
        text = str(row['text'])[:2000] if pd.notna(row['text']) else ''
        full_text = title + ' ' + text

        # Step 1: Extract company-ticker pairs (builds cache)
        pairs = self.extract_company_ticker_pairs(full_text)
        if pairs:
            # Return the ticker from first pair
            return pairs[0][1]

        # Step 2: Check if any cached company names appear in text
        for company_name, cached_ticker in self.company_ticker_cache.items():
            if company_name in full_text.lower():
                return cached_ticker

        # Step 3: Extract tickers using patterns
        ticker_scores = self.extract_pattern_tickers(full_text)

        # Step 4: Extract company names and look for nearby tickers
        company_names = self.extract_capitalized_names(title)
        for name in company_names[:3]:  # Check first 3 names
            nearby_ticker = self.find_ticker_near_name(name, full_text)
            if nearby_ticker:
                ticker_scores[nearby_ticker] += 5.0

        # Step 5: Select best ticker
        best_ticker = self.score_and_select_ticker(ticker_scores, title, full_text)

        return best_ticker


# Main execution
extractor = SmartTickerExtractor()

print('Processing articles\n')

# Get rows without tickers
rows_without_ticker = df['ticker'].isna()
total_missing = rows_without_ticker.sum()
print(f'Rows without ticker: {total_missing:,}')
print(f'Total rows: {len(df):,}\n')

# Extract tickers
new_tickers = {}
batch_size = 100
processed = 0

print('Extracting tickers')
for idx in df[rows_without_ticker].index:
    row = df.loc[idx]
    ticker = extractor.extract_ticker(row)

    if ticker:
        new_tickers[idx] = ticker

    processed += 1
    if processed % batch_size == 0:
        pct = (processed / total_missing) * 100
        print(f'  Progress: {processed:,}/{total_missing:,} ({pct:.1f}%) - Found: {len(new_tickers):,} tickers')

# Apply extracted tickers to dataframe
for idx, ticker in new_tickers.items():
    df.loc[idx, 'ticker'] = ticker

print(f'Extraction complete!')
print(f'  Extracted: {len(new_tickers):,} new tickers')
print(f'  Learning cache size: {len(extractor.company_ticker_cache):,} company-ticker mappings')

# Display results
print('RESULTS')
print(f'Total rows:{len(df):,}')
print(f'Rows with ticker:{df["ticker"].notna().sum():,} ({df["ticker"].notna().sum()/len(df)*100:.2f}%)')
print(f'Rows without ticker:{df["ticker"].isna().sum():,} ({df["ticker"].isna().sum()/len(df)*100:.2f}%)')
print(f'Improvement: +{len(new_tickers):,} articles tagged')

# Show distribution of newly extracted tickers
if new_tickers:
    print('\n' + '='*70)
    print('TOP 20 NEWLY EXTRACTED TICKERS')
    print('='*70)
    ticker_dist = Counter(new_tickers.values())
    for i, (ticker, count) in enumerate(ticker_dist.most_common(20), 1):
        print(f'{i:2d}. {ticker:8s}: {count:5,} articles ({count/len(new_tickers)*100:5.2f}%)')

    # Show some company-ticker mappings learned
    if extractor.company_ticker_cache:
        print('\n' + '='*70)
        print('SAMPLE LEARNED COMPANY-TICKER MAPPINGS')
        print('='*70)
        sample_size = min(15, len(extractor.company_ticker_cache))
        for i, (company, ticker) in enumerate(list(extractor.company_ticker_cache.items())[:sample_size], 1):
            print(f'{i:2d}. {company.title():<40s} -> {ticker}')

# Show examples of extracted articles
print('SAMPLE EXTRACTIONS')
sample_count = min(10, len(new_tickers))
for i, idx in enumerate(list(new_tickers.keys())[:sample_count], 1):
    row = df.loc[idx]
    print(f'\n{i}. TICKER: {row["ticker"]}')
    print(f'   TITLE: {row["title"][:100]}...')

# Save updated dataframe
print('Saving updated dataframe')
df.to_pickle('financial_news_df.pkl')
print('Saved as financial_news_df.pkl')