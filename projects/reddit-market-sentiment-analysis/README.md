# Reddit Market Sentiment Analysis

## Overview
This project analyzes financial market sentiment by combining **large-scale Reddit discussions** with **financial news data** to track how investor mood evolves over time. The system transforms unstructured text into structured sentiment signals at the **ticker** and **sector** levels and presents them through an interactive visualization dashboard.

The core contribution is a scalable sentiment pipeline that leverages **LLM-assisted labeling**, a **lightweight neural network classifier**, and a **cloud-based data architecture** to bridge formal financial news with informal retail investor sentiment.

---

## Problem Statement
Investor sentiment plays a critical role in short-term market dynamics, yet traditional sentiment tools rely heavily on structured news sources and static indices. Social platforms like Reddit often reflect shifts in optimism or fear earlier than formal reporting.

This project asks:

**Can sentiment extracted from Reddit discussions, when modeled correctly, provide meaningful insight into market mood across companies and sectors?**

---

## Data Sources
- **Financial News Headlines**
  - Used for supervised model training
  - Labeled using a large language model (LLM)
- **Reddit Posts and Comments**
  - Finance-focused subreddits (e.g., investing and trading communities)
  - Used for sentiment deployment and visualization
- **Market Metadata**
  - Ticker and sector mappings for aggregation and analysis

---

## Methodology
- **LLM-Assisted Labeling**
  - Financial news headlines labeled as positive, neutral, or negative using structured prompts
- **Neural Network Sentiment Model**
  - Feed-forward classifier trained on LLM-labeled data
  - Designed for efficient inference on high-volume social media text
- **Reddit Ingestion Pipeline**
  - Continuous collection, cleaning, and ticker extraction
  - Finance-aware preprocessing that preserves symbols, numbers, and slang
- **Aggregation & Storage**
  - Sentiment scores stored in a PostgreSQL database
  - Daily, rolling, and sector-level summaries computed via SQL
- **Interactive Visualization**
  - Dash / Plotly dashboard for exploring sentiment trends over time

---

## Key Results
- The sentiment classifier achieved strong validation performance on financial news data
- The model generalized effectively to informal Reddit language
- Aggregated sentiment trends revealed clear shifts during high-discussion market periods
- Sector-level views highlighted differences in sentiment intensity across industries

---

## Visualization
The interactive dashboard allows users to:
- Track sentiment time series for individual tickers or sectors
- Compare Reddit-only sentiment with combined news + Reddit sentiment
- Explore industry-wide sentiment patterns via heatmaps

A demo video and example figures are included in the repository.

---

## Tools & Technologies
- **Python** (pandas, NumPy, scikit-learn)
- **Natural Language Processing**
  - TF-IDF and embedding-based features
  - LLM-assisted labeling
- **Data Engineering**
  - PostgreSQL
  - Cloud-based deployment
- **Visualization**
  - Dash
  - Plotly

---

## Repository Structure
