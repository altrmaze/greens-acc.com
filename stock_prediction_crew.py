import os

import yfinance as yf
from crewai import Agent, Crew, Process, Task
from crewai.tools import tool
from langchain_community.tools import DuckDuckGoSearchRun
from langchain_openai import ChatOpenAI


OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
if not OPENAI_API_KEY:
    raise RuntimeError("OPENAI_API_KEY environment variable is required.")

llm = ChatOpenAI(model="gpt-4o", temperature=0.1, api_key=OPENAI_API_KEY)
search_tool = DuckDuckGoSearchRun()


@tool("Stock Price & News Ticker Tool")
def fetch_stock_data(ticker: str) -> str:
    """Fetch historical price summaries and recent pricing context for a stock ticker."""
    try:
        stock = yf.Ticker(ticker)
        info = stock.info or {}
        hist = stock.history(period="7d")
        close_series = hist["Close"].to_string() if "Close" in hist.columns else "No recent close data available."

        return (
            f"Source Checked: Yahoo Finance API\n"
            f"Ticker: {ticker}\n"
            f"Current Price: ${info.get('currentPrice', 'N/A')}\n"
            f"52 Week High: ${info.get('fiftyTwoWeekHigh', 'N/A')}\n"
            f"52 Week Low: ${info.get('fiftyTwoWeekLow', 'N/A')}\n"
            f"Recent 7-day Close Prices:\n{close_series}\n"
        )
    except Exception as exc:
        return f"Error fetching data for {ticker}: {exc}"


financial_analyst = Agent(
    role="Senior Technical Financial Analyst",
    goal="Analyze patterns, technical indicators, and volumes to find structural setups.",
    backstory=(
        "A quantitative market specialist who filters setups based purely on empirical chart numbers "
        "and documents the exact indicators checked."
    ),
    verbose=True,
    llm=llm,
    tools=[fetch_stock_data],
)

sentiment_analyst = Agent(
    role="Global News & Sentiment Analyst",
    goal="Scan breaking news, financial reviews, and global sentiment updates.",
    backstory=(
        "An expert financial analyst tracking live press releases, geopolitical updates, and macro risks. "
        "Must explicitly record sources used."
    ),
    verbose=True,
    llm=llm,
    tools=[search_tool],
)

committee_chair = Agent(
    role="Chief Investment Officer (CIO)",
    goal="Synthesize technical and sentiment intelligence into exactly ONE definitive market action with an audit trail.",
    backstory=(
        "The final decision-maker. Refuses ambiguity. Forces the team to narrow everything down to one solid "
        "recommendation while completely breaking down the reasoning and verifying every source."
    ),
    verbose=True,
    llm=llm,
)

task_technical_analysis = Task(
    description=(
        "Analyze charts and trends for: {ticker_list}. "
        "State exactly what formulas, trends, or tools you checked."
    ),
    expected_output=(
        "Technical health assessment for the asset pool along with data logs."
    ),
    agent=financial_analyst,
)

task_sentiment_analysis = Task(
    description=(
        "Scan live global news, financial reviews, magazines, and economic data over the last 48 hours "
        "for: {ticker_list}. You must document the names of the websites, domains, or articles you gathered "
        "information from."
    ),
    expected_output=(
        "Sentiment analysis highlighting potential catalyst events with an explicit list of domains visited."
    ),
    agent=sentiment_analyst,
)

task_final_recommendation = Task(
    description=(
        "Review the structural and sentiment data. Eliminate all weak options until only one remains. "
        "Provide EXACTLY ONE clear, solid stock recommendation. "
        "CRITICAL: After providing your pick, create a section called '### 🔍 AUDIT TRAIL AND VERIFICATION MATRIX'. "
        "In this section, explicitly list: "
        "1. Exactly why this asset won over others. "
        "2. The exact websites, news engines, economic indicators, or data applications analyzed. "
        "3. What technical parameters were verified (e.g., Yahoo Finance, specific media articles, sentiment scores)."
    ),
    expected_output=(
        "A definitive, executive-level summary selecting exactly ONE winning ticker followed by a transparent "
        "verification matrix of all checked resources."
    ),
    agent=committee_chair,
)

stock_prediction_crew = Crew(
    agents=[financial_analyst, sentiment_analyst, committee_chair],
    tasks=[task_technical_analysis, task_sentiment_analysis, task_final_recommendation],
    process=Process.sequential,
    verbose=True,
)


if __name__ == "__main__":
    inputs = {"ticker_list": "NVDA, AAPL, MSFT, TSLA, AMD"}
    print("🚀 Market Intelligence Crew is waking up... Analyzing stocks...")
    result = stock_prediction_crew.kickoff(inputs=inputs)
    print("\n--- 🎯 FINAL INVESTMENT COMMITTEE RECOMMENDATION ---")
    print(result)
