==================================================================
CSE6242 Project: Interactive Financial Sentiment Dashboard
Team 176 – Michael Pucci, Matthew Cheung, Yiming Feng, Xin Lin
==================================================================

Please follow this video for detailed demonstration: https://youtu.be/fz3lhSKbyYc

DESCRIPTION
-----------
This project is an interactive web dashboard for visualizing financial sentiment data aggregated from Reddit and news sources. The application allows users to explore and compare sentiment trends for various stock tickers and industry sectors over user-selected time periods.

The dashboard features two main components:
1.  A dynamic time-series chart for detailed analysis of specific tickers or sectors.
2.  An industry-level heatmap for a high-level overview of market sentiment.

The application is built with Python using the Dash/Plotly framework. It connects to a remote PostgreSQL database through a secure SSH tunnel to fetch and display the latest sentiment data processed by our machine learning pipeline.


------------------------------------------------------------------


PREREQUISITES
-------------
1.  A terminal application (e.g., Terminal on macOS, Command Prompt on Windows, or any Linux shell).
2.  A working Python 3 environment (e.g., via Conda, venv, or a system installation).
3.  The project files (`app.py` and `requirements.txt`) located in a local project directory.


------------------------------------------------------------------


INSTALLATION
------------
This is a one-time setup to prepare your environment for running the application.

1.  Open your terminal application.

2.  Navigate to the `CODE/` directory where `app.py` and `requirements.txt` are located.
    cd path/to/your/CODE_directory

3.  Install the required Python libraries using the `requirements.txt` file. It is highly recommended to do this within a virtual environment.
    pip install -r requirements.txt


------------------------------------------------------------------


EXECUTION
---------
Follow these steps every time you want to run the dashboard. This process requires two separate terminal windows.

**Part 1: Start the Secure SSH Tunnel**

The SSH tunnel acts as a secure bridge to the database. It must be running in the background for the application to work.

1.  Open your **first** terminal window.

2.  Run the following command to create the SSH tunnel. You will be prompted for a password.
    ssh -L 5432:localhost:5432 cse6242_user@35.193.169.21
3.  Enter the password `cse6242` when prompted. You will then be logged into the remote server.

4.  **IMPORTANT:** Leave this terminal window open and running. Do not close it. Just minimize it. This window is now holding your secure connection open.


**Part 2: Run the Dashboard Application**

This will start the local web server that hosts your interactive dashboard.

1.  Open a **second, new** terminal window.

2.  Navigate to your project's `CODE/` directory:
    cd path/to/your/CODE_directory

3.  Set the six required environment variables for the database connection. Run these commands one by one, pressing Enter after each one. You will not see any confirmation output.

    export SSH_HOST="35.193.169.251"
    export SSH_USER="cse6242_user"
    export SSH_PASS="cse6242"
    export DB_USER="cse6242_user"
    export DB_PASS="cse6242"
    export DB_NAME="cse6242_db"
    
    (Note for Windows users: use `set` instead of `export`, e.g., `set SSH_HOST="35.193.169.251"`)

4.  Run the Python application:
    python app.py

**Part 3: View the Dashboard**

1.  After running the command, your terminal will display output indicating that the server is running, such as:
    `Dash is running on http://0.0.0.0:8050/`

2.  Open a web browser (e.g., Chrome, Safari, Firefox).

3.  Navigate to the following address:
    http://127.0.0.1:8050

Your interactive dashboard will now be live in your browser.