import praw
import pandas as pd
from datetime import datetime, timedelta, timezone
from text_preprocessing import clean_reddit_headline
import os
from tqdm import tqdm

# Reddit API credentials (from praw.ini or environment variables)
reddit = praw.Reddit(
    client_id=os.getenv("REDDIT_CLIENT_ID"),
    client_secret=os.getenv("REDDIT_CLIENT_SECRET"),
    user_agent=os.getenv("REDDIT_USER_AGENT", "cse6242-market-sentiment-bot")
)

# Define tickers (from sector_map)
tickers = [
    "AAPL","MSFT","NVDA","AMD","INTC","QCOM","CSCO","ORCL","IBM","ADBE","CRM",
    "GOOGL","META","NFLX","DIS","VZ","T","TMUS","PARA","WBD","TTWO","EA",
    "AMZN","TSLA","HD","MCD","NKE","SBUX","LOW","BKNG","TGT","LVS","RCL",
    "PG","KO","PEP","WMT","COST","PM","MO","CL","KMB","TAP","GIS",
    "XOM","CVX","COP","SLB","HAL","EOG","PSX","VLO","MPC","OXY","BKR",
    "JPM","BAC","WFC","C","GS","MS","AXP","SCHW","BK","BLK","TFC",
    "JNJ","PFE","MRK","UNH","LLY","ABBV","TMO","DHR","BMY","AMGN","CVS",
    "CAT","GE","BA","HON","LMT","NOC","DE","MMM","RTX","GD","ETN",
    "LIN","SHW","APD","NEM","DD","FCX","ECL","VMC","MLM","CF","ALB",
    "NEE","DUK","SO","D","AEP","EXC","SRE","XEL","PEG","ED","WEC",
    "PLD","AMT","EQIX","CCI","O","PSA","SPG","WELL","VICI","DLR","AVB"
]

# Subreddits to search
subreddits = [
    "stocks","investing","wallstreetbets","StockMarket","options",
    "finance","personalfinance","algotrading","pennystocks",
    "economy","dividends","cryptocurrency","daytrading","valueinvesting"
]

# Collect posts from past 365 days (at least 90 days worth)
cutoff_date = datetime.now(timezone.utc) - timedelta(days=365)
data = []

print("Starting Reddit collection...")

for ticker in tqdm(tickers, desc="Tickers"):
    for sub in subreddits:
        try:
            for submission in reddit.subreddit(sub).search(ticker, sort="new", time_filter="year", limit=250):
                created_time = datetime.fromtimestamp(submission.created_utc, tz=timezone.utc)
                if created_time < cutoff_date:
                    continue
                cleaned_title = clean_reddit_headline(submission.title)
                if not cleaned_title.strip():
                    continue
                data.append({
                    "published": created_time.isoformat(),
                    "title": cleaned_title
                })
        except Exception as e:
            print(f"Error fetching {ticker} from r/{sub}: {e}")

# Convert to DataFrame
df = pd.DataFrame(data).drop_duplicates()

# Ensure directory exists
os.makedirs("data", exist_ok=True)

# Remove common repetitive discussion threads
ban_patterns = [
    "daily discussion", "fundamental friday", "technical tuesday",
    "what are your moves", "options trading thursday",
    "weekend discussion", "daily thread"
]

df = df[~df["title"].str.contains("|".join(ban_patterns), case=False, na=False)]

# Drop duplicates again in case cleaned titles overlap
df = df.drop_duplicates(subset=["title"])

# Save final CSV
output_path = "data/reddit_sentiment_input.csv"
df.to_csv(output_path, index=False)

print(f"\nCollected {len(df)} total cleaned posts.")
print(f"Saved to {output_path}")
