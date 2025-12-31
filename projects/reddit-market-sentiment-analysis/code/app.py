# app.py - CSE6242 Final Project Interactive Sentiment Dashboard
# FINAL VERSION: With Specific Industry Filtering for Heatmap

# Import Necessary Libraries
import os
import pandas as pd
import plotly.graph_objects as go
from dash import Dash, dcc, html, Input, Output
from sqlalchemy import create_engine, text
from sshtunnel import SSHTunnelForwarder
import warnings

warnings.filterwarnings(action='ignore', module='.*paramiko.*')

# Helper Functions
def classify_sentiment_bipolar(score):
    if score > 20: return 'Positive'
    elif score < -20: return 'Negative'
    else: return 'Neutral'

# Data Loading Function
def load_all_data():
    all_dataframes = {}
    ssh_host = os.environ.get('SSH_HOST')
    ssh_user = os.environ.get('SSH_USER')
    ssh_pass = os.environ.get('SSH_PASS')
    db_user = os.environ.get('DB_USER')
    db_pass = os.environ.get('DB_PASS')
    db_name = os.environ.get('DB_NAME')

    if not all([ssh_host, ssh_user, ssh_pass, db_user, db_pass, db_name]):
        print("FATAL ERROR: Missing one or more required environment variables.")
        return None

    try:
        print("Opening SSH tunnel and connecting to database")
        with SSHTunnelForwarder(
            (ssh_host, 22),
            ssh_username=ssh_user,
            ssh_password=ssh_pass,
            remote_bind_address=('localhost', 5432)
        ) as tunnel:
            
            db_url = f"postgresql://{db_user}:{db_pass}@127.0.0.1:{tunnel.local_bind_port}/{db_name}"
            engine = create_engine(db_url)
            
            tables_to_load = {
                'reddit_ticker': 'reddit_ticker_sentiment_stats',
                'reddit_sector': 'reddit_sector_sentiment_stats',
                'merged_ticker': 'merged_ticker_sentiment_stats',
                'merged_sector': 'merged_sector_sentiment_stats'
            }

            with engine.connect() as connection:
                for key, table_name in tables_to_load.items():
                    print(f"Loading table: {table_name}...")
                    query = text(f'SELECT * FROM "{table_name}"')
                    df = pd.read_sql(query, connection)
                    df['date'] = pd.to_datetime(df['date'])
                    all_dataframes[key] = df
            
            print("All data loaded successfully.")
            return all_dataframes

    except Exception as e:
        print(f"An error occurred during data loading: {e}")
        return None

# Load Data and Initialize Dash App
dataframes = load_all_data()
app = Dash(__name__)
server = app.server

if not dataframes:
    app.layout = html.H1("Error: Could not connect to the database. Check logs.")
else:
    # Define the Application Layout
    min_date = min(df['date'].min() for df in dataframes.values()).date()
    max_date = max(df['date'].max() for df in dataframes.values()).date()

    app.layout = html.Div([
        html.H1("Interactive Financial Sentiment Dashboard", style={'textAlign': 'center'}),
        
        # Global Control Panel
        html.Div([
            html.Div([
                html.Label("1. Select Data Source"),
                dcc.RadioItems(id='data-source-selector', options=['Reddit Only', 'Merged (News + Reddit)'], value='Reddit Only', inline=True)
            ], style={'width': '33%', 'display': 'inline-block'}),
            html.Div([
                html.Label("2. Select Granularity"),
                dcc.RadioItems(id='granularity-selector', options=['By Ticker', 'By Sector'], value='By Ticker', inline=True)
            ], style={'width': '33%', 'display': 'inline-block'}),
            html.Div([
                html.Label("3. Select Date Range"),
                dcc.DatePickerRange(id='date-range-selector', min_date_allowed=min_date, max_date_allowed=max_date, start_date=min_date, end_date=max_date)
            ], style={'width': '33%', 'display': 'inline-block'})
        ], style={'border': '1px solid #ddd', 'padding': '10px', 'marginBottom': '20px'}),
        
        # Time-Series Analysis Section
        html.H2("Time-Series Analysis"),
        html.Div([
            html.Div([
                html.Label(id='entity-selector-label'),
                dcc.Dropdown(id='entity-selector', multi=True)
            ], style={'width': '70%', 'display': 'inline-block', 'verticalAlign': 'top'}),
            html.Div([
                html.Label("Select Score Type"),
                dcc.Checklist(id='score-type-selector', options=['Daily Average', '90-Day Rolling'], value=['Daily Average'], inline=False)
            ], style={'width': '28%', 'display': 'inline-block', 'float': 'right'})
        ]),
        dcc.Graph(id='time-series-chart'),
        html.Hr(),

        # Heatmap Section (Updated with Filters)
        html.H2("Sentiment Overview by Industry"),
        html.Div([
            # Specific Dropdown for Heatmap Sectors
            html.Div([
                html.Label("Filter Industries:"),
                dcc.Dropdown(id='heatmap-sector-filter', multi=True)
            ], style={'width': '70%', 'display': 'inline-block', 'verticalAlign': 'top'}),
            
            # Heatmap Score Type Selector
            html.Div([
                html.Label("Select Score Type:"),
                dcc.RadioItems(
                    id='heatmap-score-selector',
                    options=[
                        {'label': 'Daily Average', 'value': 'avg_sentiment_score'},
                        {'label': '90-Day Rolling', 'value': 'rolling_90d_sentiment'}
                    ],
                    value='avg_sentiment_score',
                    inline=True
                )
            ], style={'width': '28%', 'display': 'inline-block', 'float': 'right', 'marginTop': '10px'})
        ]),
        dcc.Graph(id='sector-heatmap')

    ], style={'padding': '20px'})

# Define Callbacks for Interactivity

# Callback 1: Update the Time-Series Entity Dropdown
@app.callback(
    Output('entity-selector', 'options'),
    Output('entity-selector-label', 'children'),
    Input('granularity-selector', 'value'),
    Input('data-source-selector', 'value')
)
def update_entity_dropdown(granularity, data_source):
    source_prefix = 'reddit' if data_source == 'Reddit Only' else 'merged'
    if granularity == 'By Ticker':
        df_key = f"{source_prefix}_ticker"
        options_list = sorted(dataframes[df_key]['ticker'].unique())
        label_text = "4. Select Ticker(s)"
    else: # By Sector
        df_key = f"{source_prefix}_sector"
        options_list = sorted(dataframes[df_key]['sector'].unique())
        label_text = "4. Select Sector(s)"
    return [{'label': i, 'value': i} for i in options_list], label_text

# Callback 2: NEW - Populate the Heatmap Industry Filter (Defaults to All)
@app.callback(
    Output('heatmap-sector-filter', 'options'),
    Output('heatmap-sector-filter', 'value'),
    Input('data-source-selector', 'value')
)
def update_heatmap_filter_options(data_source):
    source_prefix = 'reddit' if data_source == 'Reddit Only' else 'merged'
    df_key = f"{source_prefix}_sector"
    
    # Get all unique sectors
    sector_list = sorted(dataframes[df_key]['sector'].unique())
    options = [{'label': i, 'value': i} for i in sector_list]
    
    # Default value is ALL sectors, so the map isn't blank initially
    return options, sector_list

# Callback 3: Main callback to update BOTH graphs
@app.callback(
    Output('time-series-chart', 'figure'),
    Output('sector-heatmap', 'figure'),
    Input('data-source-selector', 'value'),
    Input('granularity-selector', 'value'),
    Input('date-range-selector', 'start_date'),
    Input('date-range-selector', 'end_date'),
    Input('entity-selector', 'value'),
    Input('score-type-selector', 'value'),
    Input('heatmap-score-selector', 'value'),
    Input('heatmap-sector-filter', 'value') # New input for heatmap filtering
)
def update_graphs(data_source, granularity, start_date, end_date, selected_entities, selected_scores, heatmap_score_col, selected_heatmap_sectors):
    source_prefix = 'reddit' if data_source == 'Reddit Only' else 'merged'

    # Build the Time-Series Figure
    entity_col = 'ticker' if granularity == 'By Ticker' else 'sector'
    df_key = f"{source_prefix}_{entity_col}"
    df_line = dataframes[df_key]
    df_line_filtered = df_line[(df_line['date'] >= pd.to_datetime(start_date)) & (df_line['date'] <= pd.to_datetime(end_date))]
    
    fig_line = go.Figure()
    fig_line.update_layout(title_text="Sentiment Over Time", legend_title="Legend", yaxis_title="Sentiment Score (-100 to 100)")
    
    if selected_entities and selected_scores:
        df_line_final = df_line_filtered[df_line_filtered[entity_col].isin(selected_entities)]
        for entity in selected_entities:
            df_entity = df_line_final[df_line_final[entity_col] == entity]
            if 'Daily Average' in selected_scores:
                fig_line.add_trace(go.Scatter(x=df_entity['date'], y=df_entity['avg_sentiment_score'], name=f'{entity} - Daily', mode='lines+markers'))
            if '90-Day Rolling' in selected_scores:
                fig_line.add_trace(go.Scatter(x=df_entity['date'], y=df_entity['rolling_90d_sentiment'], name=f'{entity} - 90d Rolling', mode='lines', line={'dash': 'dot'}))

    # Build the Heatmap Figure
    df_heatmap_key = f"{source_prefix}_sector"
    df_heatmap = dataframes[df_heatmap_key]
    
    # Apply Date Filter
    df_heatmap_filtered = df_heatmap[(df_heatmap['date'] >= pd.to_datetime(start_date)) & (df_heatmap['date'] <= pd.to_datetime(end_date))]
    
    # Apply NEW Industry Filter
    if selected_heatmap_sectors:
         df_heatmap_filtered = df_heatmap_filtered[df_heatmap_filtered['sector'].isin(selected_heatmap_sectors)]

    # Create Pivot Table
    pivot = df_heatmap_filtered.pivot_table(
        index='sector', 
        columns='date', 
        values=heatmap_score_col, 
        aggfunc='mean'
    )
    
    fig_heatmap = go.Figure(data=go.Heatmap(
        z=pivot.values, x=pivot.columns, y=pivot.index,
        colorscale='RdBu_r', zmin=-100, zmax=100
    ))
    
    heatmap_title_text = "Daily Average" if heatmap_score_col == 'avg_sentiment_score' else "90-Day Rolling"
    fig_heatmap.update_layout(title=f'{heatmap_title_text} Sentiment by Industry', xaxis_title='Date', yaxis_title='Industry')

    return fig_line, fig_heatmap

# Run the Application
if __name__ == '__main__':
    if dataframes:
        app.run(debug=True, host='0.0.0.0', port=8050)