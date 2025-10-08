# Predicting Voter Turnout and Election-Day Operations in Macomb County, Michigan

**Machine learning analysis forecasting 2028 voter turnout and party vote share for Clinton Township, Michigan.**

---

## Project Overview

This project applies supervised machine learning to forecast **voter turnout** and **party vote share** in the 2028 Presidential Election for Clinton Township, Michigan.  

The goal was to use historical, demographic, and contextual data to anticipate resource needs and operational planning for local election administration.

The project was developed as part of **ISyE 6740: Computational Data Analytics (Georgia Tech)**.  

It focuses on:
- Predicting **overall voter turnout** using historical and demographic data  
- Estimating **Democratic vs. Republican vote share** based on turnout and macro-level indicators  
- Evaluating multiple regression and ensemble models to identify the most accurate, interpretable solution  

---

## Features

- Predicts **voter turnout percentage** and **vote share** for upcoming elections  
- Tests multiple supervised learning algorithms for performance comparison  
- Implements **Lasso Regression**, **Linear Regression**, and **Ensemble models**  
- Evaluates models using **Leave-One-Out Cross-Validation (LOOCV)**  
- Produces **2028 Presidential Election forecasts** for Clinton Township  

---

## Technology Stack

- **Python (Jupyter Notebook)** – Model development and evaluation  
- **scikit-learn** – Machine learning algorithms and cross-validation  
- **pandas / NumPy** – Data processing and feature engineering  
- **Matplotlib / Seaborn** – Visualization of trends and residuals  
- **Excel (input)** – Historical voter data and demographic records  

---

## Data Sources

### 1. Extended Master Voter Turnout Dataset
Predicts overall voter turnout using:
- Election year and type  
- COVID impact flag and weather severity  
- Age group and education distributions  
- Median income and population density  
- Lagged turnout from prior elections  

### 2. Clinton Township Vote Share Dataset
Predicts Democratic vote share using:
- Predicted turnout (from Model 1)  
- Major race flag and election type  
- Weather and COVID impact  
- Past Democratic vote share (lags of 1 and 2)  
- Political betting odds and national trends  

---

## Model Overview

| Model | Description |
|--------|-------------|
| **Linear Regression** | Baseline model for both turnout and vote share prediction. |
| **Ridge Regression** | Regularized model to control variance with small datasets. |
| **Lasso Regression** | Performs automatic feature selection using L1 regularization. |
| **Random Forest** | Ensemble model capturing nonlinear effects. |
| **Gradient Boosting** | Sequential error-correcting ensemble learner. |
| **Support Vector Regressor (SVR)** | Kernel-based regression capturing complex relationships. |
| **K-Nearest Neighbors (KNN)** | Instance-based learner for comparison. |

**Validation:** Leave-One-Out Cross-Validation (LOOCV)  
**Metric:** Mean Absolute Error (MAE)

---

## Model Results

| Task | Best Model | Mean Absolute Error |
|------|-------------|---------------------|
| **Voter Turnout Prediction** | **Lasso Regression** | **1.96%** |
| **Vote Share Prediction** | **Linear Regression** | **2.16%** |

Other models (Ridge, Random Forest, Gradient Boosting, SVR) underperformed due to overfitting or instability with small sample size.

---

## 2028 Presidential Forecast (Clinton Township)

| Metric | Predicted Value |
|--------|------------------|
| Registered Voters | 84,005 |
| Turnout Rate | **54.73%** |
| Votes Cast | 45,976 |
| Democratic Share | **54.29%** |
| Republican Share | 45.71% |
| Projected Winner | **Democratic Party** |

---

## Insights

- **Lasso Regression** performed best for turnout due to its ability to reduce model variance and automatically select key predictors.  
- **Linear Regression** offered the most stable performance for vote share given the small dataset and low multicollinearity.  
- Predictive models suggest that turnout remains stable post-2020 with a modest Democratic advantage.  
- Results can inform staffing, budgeting, and resource allocation for upcoming elections.

---

## Author

**Matthew Cheung**  
📧 [cheung12@msu.edu](mailto:cheung12@msu.edu)  
🔗 [LinkedIn](https://www.linkedin.com/in/cheung-matthew/)
