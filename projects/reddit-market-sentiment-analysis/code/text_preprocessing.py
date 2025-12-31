# text_preprocessing.py

"""
Text Preprocessing Module for Reddit Data.

This script provides a function to clean and preprocess raw text data,
specifically tailored for Reddit headlines in a machine learning context.
The cleaning process prepares the text for NLP tasks like sentiment analysis
by standardizing the text while preserving its contextual meaning.

This version intentionally RETAINS stopwords, as they can be critical for
accurate sentiment analysis (e.g., preserving negation words like 'not').

Required Libraries:
- NLTK: The Natural Language Toolkit (pip install nltk)

One-Time Setup:
Before first use, the following NLTK data package must be downloaded for lemmatization.
Run this in a Python interpreter:
>>> import nltk
>>> nltk.download('wordnet')
"""

import re
import string

# NLTK imports are placed here for clarity.
# Ensure the required data is downloaded as per the instructions above.
from nltk.stem import WordNetLemmatizer

def clean_reddit_headline(text: str) -> str:
    """
    Cleans and preprocesses a single Reddit headline for ML applications.

    The preprocessing pipeline consists of the following steps:
    1.  Validate input is a string.
    2.  Convert text to lowercase.
    3.  Remove URLs.
    4.  Remove all punctuation.
    5.  Remove numerical digits.
    6.  Tokenize the text (split into words).
    7.  Lemmatize tokens to their base form (e.g., 'investing' -> 'invest').
    8.  Rejoin tokens into a clean string.

    """
    # 1. Validate input
    if not isinstance(text, str):
        return ""

    # 2. Convert to lowercase
    text = text.lower()

    # 3. Remove URLs
    text = re.sub(r'https?://\S+|www\.\S+', '', text)

    # 4. Remove punctuation
    # string.punctuation contains '!"#$%&\'()*+,-./:;<=>?@[\\]^_`{|}~'
    text = text.translate(str.maketrans('', '', string.punctuation))

    # 5. Remove numbers
    text = re.sub(r'\d+', '', text)

    # 6. Tokenize
    tokens = text.split()

    # 7. Lemmatization (Stopwords are intentionally kept)
    lemmatizer = WordNetLemmatizer()
    tokens = [lemmatizer.lemmatize(word) for word in tokens]

    # 8. Rejoin and remove extra whitespace
    return " ".join(tokens).strip()


# This block executes only when the script is run directly.
# It serves as a built-in test and demonstration of the function.
if __name__ == '__main__':
    print("--- Running Preprocessing Function Self-Test (Stopwords Retained) ---")

    # A list of example headlines to test
    sample_headlines = [
        "AMC to the MOON!! 🚀 I'm not selling my 1,500 shares. Check this out: https://example.com",
        "What are your thoughts on the latest $TSLA earnings report for Q4 2025? It was not good.",
        "💎🙌 Diamond hands holding GME and BBBY forever! I will never sell.",
        "This is just a regular sentence about investing and markets.",
        12345,  # Test case for non-string input
        ""      # Test case for empty string
    ]

    # Process and print the results for each sample headline
    for i, headline in enumerate(sample_headlines):
        print(f"Original: {headline}")
        cleaned_headline = clean_reddit_headline(headline)
        print(f"Cleaned: '{cleaned_headline}'")