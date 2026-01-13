"""
Static lists of tickers for major indices to support market screening.
These lists serve as the 'universe' for the screener when a specific market is selected.
"""

SP500_TICKERS = [
    # Top S&P 500 Tickers by approximate weight (Top ~150)
    "AAPL", "MSFT", "GOOGL", "GOOG", "AMZN", "NVDA", "META", "TSLA", "BRK.B", "LLY",
    "JPM", "V", "UNH", "MA", "AVGO", "HD", "JNJ", "PG", "COST", "MRK",
    "ABBV", "PEP", "ADBE", "CVX", "KO", "CRM", "BAC", "WMT", "ACN", "MCD",
    "AMD", "TMO", "CSCO", "ABT", "LIN", "INTC", "WFC", "CMCSA", "PFE", "NFLX",
    "DHR", "DIS", "TXN", "VZ", "ORCL", "PM", "NEE", "NKE", "RTX", "HON",
    "UPS", "UNP", "AMGN", "BMY", "LOW", "SPGI", "QCOM", "BA", "INTU", "COP",
    "IBM", "GE", "CAT", "PLD", "SBUX", "MS", "DE", "GS", "AXP", "BLK",
    "MDLZ", "TJX", "ADP", "BKNG", "ISRG", "GILD", "MMC", "T", "ADI", "LMT",
    "SYK", "CVS", "VRTX", "LRCX", "ZTS", "REGN", "CI", "C", "ETN", "SLB",
    "BSX", "EOG", "FI", "BDX", "TMUS", "MO", "PGR", "MU", "SO", "NOC",
    "CB", "PANW", "SNPS", "EQIX", "KLAC", "DUK", "CDNS", "ITW", "SHW", "CSX",
    "WM", "CL", "APD", "MMM", "ICE", "FDX", "HUM", "TGT", "PH", "MCK",
    "USB", "EMR", "PNC", "ORLY", "MCO", "HCA", "APH", "MAR", "NXPI", "AIG",
    "NSC", "PSX", "DXCM", "TT", "GD", "ECL", "MSI", "ROP", "FTNT", "ADSK",
    "CME", "OXY", "GM", "FCX", "PSA", "COF", "MPC", "WELL", "AZO", "PAYX",
    "F", "AEP", "SRE", "TRV", "HLT", "CARR", "MSCI", "MET", "PCAR", "D",
    "O", "A", "OKE", "KMB", "ALL", "TRGP", "KMI", "WMB", "ROK", "AMP",
    "BK", "JCI", "CHTR", "CMG", "STZ", "CTAS", "AFL", "PRU", "YUM", "GWW",
    "ED", "FIS", "EXC", "PAYC", "FAST", "DFS", "PEG", "TEL", "VLO", "KR",
    "AME", "RSG", "GLW", "OTIS", "VRSK", "EA", "ODFL", "XEL", "GPN", "HPQ",
]

NASDAQ100_TICKERS = [
    # NASDAQ 100 (Non-Financial)
    "AAPL", "MSFT", "GOOGL", "GOOG", "AMZN", "NVDA", "META", "TSLA", "AVGO", "ADBE",
    "COST", "PEP", "CSCO", "NFLX", "AMD", "TMUS", "CMCSA", "INTC", "TXN", "AMGN",
    "HON", "INTU", "QCOM", "BKNG", "ISRG", "ADI", "SBUX", "MDLZ", "ADP", "GILD",
    "LRCX", "REGN", "VRTX", "PANW", "SNPS", "KLAC", "CDNS", "MU", "MELI", "PYPL",
    "ASML", "CSX", "MAR", "NXPI", "ROP", "ORLY", "FTNT", "ADSK", "CTAS", "PCAR",
    "MNST", "KDP", "ODFL", "PAYX", "CHTR", "LULU", "AEP", "KHC", "FAST", "EXC",
    "BKR", "GFS", "IDXX", "VRSK", "EA", "XEL", "CTSH", "CSGP", "GEHC", "BIIB",
    "ON", "DXCM", "WBD", "MCHP", "DLTR", "ANSS", "TTWO", "SIRI", "WBA", "EBAY",
    "ZM", "ALGN", "ILMN", "ENPH", "JD", "BIDU", "TEAM", "WDAY", "ZS", "DDOG",
    "CRWD", "LCID", "RIVN", "PDD", "MRNA", "SPLK", "OKTA", "DOCU", "MTCH", "SWKS"
]

FTSE100_TICKERS = [
    # UK Major Stocks (Many have ADRs or are major global caps)
    "HSBC", "SHEL", "AZN", "LIN", "BHP", "ULVR", "BP", "RIO", "DEO", "BTI",
    "GSK", "REL", "DGE", "LSEG", "NG.", "LLOY", "BARC", "VOD", "GLEN", "AAL",
    "CPG", "EXPN", "BA.", "WPP", "SN.", "RR.", "TSCO", "STAN", "NWG", "IMB",
    "TW.", "LGEN", "AV.", "SSE", "III", "MNDI", "KGF", "SBRY", "BRBY", "WTB"
]

DEFAULT_UNIVERSE = SP500_TICKERS[:200]
