README Sentiment Model Training and Reddit/News Sentiment Pipeline

Overview This repository contains all components used to build, train,
and deploy sentiment-classification models for both financial news and
Reddit market discussions. The system includes raw-data collection,
preprocessing, model training, evaluation, aggregation, and database
ingestion. All steps can be reproduced using the files and paths
outlined below.

File Structure /project-root data/raw/input_sentiment_dataset.csv
data/processed/cleaned_dataset.csv models/sentiment_model.pkl
models/tfidf_vectorizer.pkl notebooks/Sentiment Model Training.ipynb

Additional Reddit and merged workflow files: reddit_sentiment_input.csv
final_reddit_with_sentiment.csv reddit_ticker_sentiment_stats_90d.csv
reddit_sector_sentiment_stats_90d.csv merged_sentiment_news.csv
final_merged_with_sentiment.csv merged_ticker_sentiment_stats_90d.csv
merged_sector_sentiment_stats_90d.csv

Supporting model/utility files: sentiment_ffnn_model.pt
financial_news_df.pkl label_encoder.pkl vocab.pkl
smart_ticker_extraction.py

Step-by-Step Workflow (News Pipeline) Load Raw Data The notebook reads
the dataset from: data/raw/input_sentiment_dataset.csv It loads text and
sentiment labels, checks class distribution, and previews sample rows.

Clean and Preprocess The cleaned data is written to:
data/processed/cleaned_dataset.csv Processing includes lowercasing,
symbol cleanup, URL removal, ticker handling, tokenization,
lemmatization, and stopword removal.

Split and Vectorize TF-IDF features are generated and saved to:
models/tfidf_vectorizer.pkl This step performs the train/test split,
constructs the vectorizer, and optionally includes n-grams.

Train Models Models trained include Logistic Regression, Linear SVM, and
optionally Random Forest. Performance metrics determine the best model.

Evaluate Results Outputs include accuracy, precision, recall, F1 score,
confusion matrix, and misclassification review. Visual plots are
generated inside the notebook.

Export the Final Model The trained model is saved to:
models/sentiment_model.pkl The TF-IDF vectorizer is saved for use in
APIs or dashboards.

Reddit Sentiment Pipeline Reddit Data Collection reddit_collector.py
connects to Reddit using PRAW, scrapes finance subreddit posts, and
saves them to: data/reddit/reddit_sentiment_input.csv

Reddit Text Preprocessing text_preprocessing.py cleans raw Reddit text
using a finance-specific routine that preserves tickers and
market-relevant tokens.

Reddit Sentiment Model ResultGenerationReddit.ipynb processes the cleaned text
and outputs: final_reddit_with_sentiment.csv

Reddit Aggregation Rolling 90-day sentiment statistics:
reddit_ticker_sentiment_stats_90d.csv
reddit_sector_sentiment_stats_90d.csv

Merged Dataset Pipeline ResultsGenerationRedditAndNonReddit.ipynb produces merged datasets
and 90-day aggregated stats: final_merged_with_sentiment.csv
merged_ticker_sentiment_stats_90d.csv
merged_sector_sentiment_stats_90d.csv

Core Files sentiment_ffnn_model.pt, financial_news_df.pkl,
label_encoder.pkl, vocab.pkl, smart_ticker_extraction.py

Requirements pandas, numpy, scikit-learn, nltk, matplotlib, seaborn,
joblib, praw, torch

How to Run Place data in data/raw/input_sentiment_dataset.csv Open
notebooks/Sentiment Model Training.ipynb Run all cells Review metrics
Model outputs will be written to /models

Output Summary Trained sentiment model TF-IDF vectorizer Cleaned dataset
Evaluation metrics Reddit sentiment outputs 90-day rolling sentiment
files Merged sentiment datasets PostgreSQL-ready aggregated files
