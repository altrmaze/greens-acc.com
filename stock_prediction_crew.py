import os

import yfinance as yf
from crewai import Agent, Crew, Process, Task
from crewai.tools import tool
from langchain_community.tools import DuckDuckGoSearchRun
from langchain_openai import ChatOpenAI


OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
if not OPENAI_API_KEY:
    raise RuntimeError("OPENAI_API_KEY environment variable is required.")

llm = ChatOpenAI(model="gpt-4o", temperature=0.2, api_key=OPENAI_API_KEY)
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
    goal="Analyze quantitative stock data, price trends, and technical indicators.",
    backstory=(
        "You are a veteran Wall Street quantitative analyst. You look strictly at numbers, "
        "patterns, moving averages, and volume to identify breakout setups."
    ),
    verbose=True,
    llm=llm,
    tools=[fetch_stock_data],
)

sentiment_analyst = Agent(
    role="Global News & Sentiment Analyst",
    goal="Analyze market sentiment, breaking news, earnings reports, and social chatter for a given stock.",
    backstory=(
        "You are an expert financial journalist and sentiment tracker. You read between the lines of "
        "news articles, press releases, and market rumors to gauge if public sentiment is bullish or bearish."
    ),
    verbose=True,
    llm=llm,
    tools=[search_tool],
)

committee_chair = Agent(
    role="Chief Investment Officer (CIO)",
    goal="Synthesize technical and sentiment data to make a final, highly calculated risk-managed stock recommendation.",
    backstory=(
        "You are the ultimate decision-maker. You take the quantitative data from the Financial Analyst and "
        "the qualitative data from the Sentiment Analyst, weigh the risks, and decide if a stock is truly "
        "a promising buy for tomorrow."
    ),
    verbose=True,
    llm=llm,
)

task_technical_analysis = Task(
    description=(
        "Analyze recent price movements and technical health for the watch-list tickers: {ticker_list}. "
        "Identify which one shows the strongest technical setup for short-term gains."
    ),
    expected_output=(
        "A detailed technical analysis report highlighting the strongest stock setup with entry points "
        "and support/resistance levels."
    ),
    agent=financial_analyst,
)

task_sentiment_analysis = Task(
    description=(
        "Search and analyze the latest breaking news, sentiment, and macro factors over the last 48 hours "
        "for the tickers: {ticker_list}."
    ),
    expected_output=(
        "A sentiment analysis report detailing whether the news cycle is highly positive, neutral, or negative "
        "for each stock, highlighting potential risks."
    ),
    agent=sentiment_analyst,
)

task_final_recommendation = Task(
    description=(
        "Review both the technical analysis report and the sentiment analysis report. Debate the pros and cons. "
        "Pick the SINGLE most promising stock from the list to watch for tomorrow. Provide a clear justification, "
        "target price, and a risk mitigation plan."
    ),
    expected_output=(
        "A final executive investment memo naming the absolute best stock pick with explicit reasoning, "
        "combining data and news sentiment."
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
