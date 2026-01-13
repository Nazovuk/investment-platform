/**
 * Internationalization (i18n) Module - Phase 1 compliant
 * 
 * Supports:
 * - en-GB (English - default)
 * - tr-TR (Turkish)
 * 
 * Features:
 * - Static translations
 * - Locale-aware number/date/currency formatting
 */

// Translation dictionaries
const translations: Record<string, Record<string, string>> = {
    'en-GB': {
        // Navigation
        'nav.home': 'Home',
        'nav.screener': 'Screener',
        'nav.discovery': 'Discovery',
        'nav.portfolio': 'Portfolio',
        'nav.alerts': 'Alerts',
        'nav.faq': 'FAQ',
        'nav.settings': 'Settings',

        // Dashboard
        'dashboard.title': 'Dashboard',
        'dashboard.marketSnapshot': 'Market Snapshot',
        'dashboard.topMovers': 'Top Movers',
        'dashboard.alertsSummary': 'Alerts Summary',
        'dashboard.portfolioValue': 'Portfolio Value',
        'dashboard.todayChange': 'Today\'s Change',

        // Screener
        'screener.title': 'Stock Screener',
        'screener.filters': 'Filters',
        'screener.results': 'Results',
        'screener.reset': 'Reset Filters',
        'screener.apply': 'Apply',
        'screener.save': 'Save Screener',
        'screener.noResults': 'No stocks match your criteria',

        // Stock Detail
        'stock.overview': 'Overview',
        'stock.chart': 'Chart',
        'stock.fundamentals': 'Fundamentals',
        'stock.financials': 'Financials',
        'stock.valuation': 'Valuation',
        'stock.news': 'News',
        'stock.trend': 'Trend',

        // Valuation
        'valuation.title': 'Fair Value Analysis',
        'valuation.fairValue': 'Fair Value',
        'valuation.currentPrice': 'Current Price',
        'valuation.upside': 'Upside/Downside',
        'valuation.status': 'Valuation Status',
        'valuation.undervalued': 'Undervalued',
        'valuation.fairlyValued': 'Fairly Valued',
        'valuation.overvalued': 'Overvalued',
        'valuation.methodology': 'Methodology',
        'valuation.disclaimer': 'This is a relative valuation estimate, not investment advice.',

        // Portfolio
        'portfolio.title': 'Portfolio',
        'portfolio.holdings': 'Holdings',
        'portfolio.transactions': 'Transactions',
        'portfolio.allocation': 'Allocation',
        'portfolio.addTransaction': 'Add Transaction',
        'portfolio.totalValue': 'Total Value',
        'portfolio.totalCost': 'Total Cost',
        'portfolio.gainLoss': 'Gain/Loss',
        'portfolio.displayCurrency': 'Display Currency',

        // Alerts
        'alerts.title': 'Alerts',
        'alerts.create': 'Create Alert',
        'alerts.active': 'Active',
        'alerts.history': 'History',
        'alerts.priceAbove': 'Price Above',
        'alerts.priceBelow': 'Price Below',

        // Common
        'common.loading': 'Loading...',
        'common.error': 'An error occurred',
        'common.retry': 'Retry',
        'common.save': 'Save',
        'common.cancel': 'Cancel',
        'common.delete': 'Delete',
        'common.edit': 'Edit',
        'common.asOf': 'As of',
        'common.nativeCurrency': 'Native Currency',
        'common.symbol': 'Symbol',
        'common.name': 'Name',
        'common.sector': 'Sector',
        'common.price': 'Price',
        'common.change': 'Change',
        'common.volume': 'Volume',
        'common.marketCap': 'Market Cap',
        'common.peRatio': 'P/E Ratio',

        // FAQ
        'faq.title': 'FAQ & Methodology',
        'faq.fairValueExplanation': 'How is Fair Value Calculated?',
        'faq.dataSources': 'Data Sources',
        'faq.assumptions': 'Assumptions',
        'faq.limitations': 'Limitations',
        'faq.disclaimers': 'Disclaimers',
    },

    'tr-TR': {
        // Navigation
        'nav.home': 'Ana Sayfa',
        'nav.screener': 'Tarayıcı',
        'nav.discovery': 'Keşfet',
        'nav.portfolio': 'Portföy',
        'nav.alerts': 'Alarmlar',
        'nav.faq': 'SSS',
        'nav.settings': 'Ayarlar',

        // Dashboard
        'dashboard.title': 'Özet Panel',
        'dashboard.marketSnapshot': 'Piyasa Özeti',
        'dashboard.topMovers': 'En Çok Hareket Eden',
        'dashboard.alertsSummary': 'Alarm Özeti',
        'dashboard.portfolioValue': 'Portföy Değeri',
        'dashboard.todayChange': 'Günlük Değişim',

        // Screener
        'screener.title': 'Hisse Tarayıcısı',
        'screener.filters': 'Filtreler',
        'screener.results': 'Sonuçlar',
        'screener.reset': 'Filtreleri Sıfırla',
        'screener.apply': 'Uygula',
        'screener.save': 'Tarayıcıyı Kaydet',
        'screener.noResults': 'Kriterlerinize uyan hisse bulunamadı',

        // Stock Detail
        'stock.overview': 'Genel Bakış',
        'stock.chart': 'Grafik',
        'stock.fundamentals': 'Temel Göstergeler',
        'stock.financials': 'Finansallar',
        'stock.valuation': 'Değerleme',
        'stock.news': 'Haberler',
        'stock.trend': 'Trend',

        // Valuation
        'valuation.title': 'Adil Değer Analizi',
        'valuation.fairValue': 'Adil Değer',
        'valuation.currentPrice': 'Güncel Fiyat',
        'valuation.upside': 'Potansiyel',
        'valuation.status': 'Değerleme Durumu',
        'valuation.undervalued': 'Değerinin Altında',
        'valuation.fairlyValued': 'Adil Değerlenmiş',
        'valuation.overvalued': 'Değerinin Üstünde',
        'valuation.methodology': 'Metodoloji',
        'valuation.disclaimer': 'Bu göreli bir değerleme tahminidir, yatırım tavsiyesi değildir.',

        // Portfolio
        'portfolio.title': 'Portföy',
        'portfolio.holdings': 'Pozisyonlar',
        'portfolio.transactions': 'İşlemler',
        'portfolio.allocation': 'Dağılım',
        'portfolio.addTransaction': 'İşlem Ekle',
        'portfolio.totalValue': 'Toplam Değer',
        'portfolio.totalCost': 'Toplam Maliyet',
        'portfolio.gainLoss': 'Kar/Zarar',
        'portfolio.displayCurrency': 'Görüntüleme Para Birimi',

        // Alerts
        'alerts.title': 'Alarmlar',
        'alerts.create': 'Alarm Oluştur',
        'alerts.active': 'Aktif',
        'alerts.history': 'Geçmiş',
        'alerts.priceAbove': 'Fiyat Üstünde',
        'alerts.priceBelow': 'Fiyat Altında',

        // Common
        'common.loading': 'Yükleniyor...',
        'common.error': 'Bir hata oluştu',
        'common.retry': 'Tekrar Dene',
        'common.save': 'Kaydet',
        'common.cancel': 'İptal',
        'common.delete': 'Sil',
        'common.edit': 'Düzenle',
        'common.asOf': 'Tarih itibarıyla',
        'common.nativeCurrency': 'Orijinal Para Birimi',
        'common.symbol': 'Sembol',
        'common.name': 'İsim',
        'common.sector': 'Sektör',
        'common.price': 'Fiyat',
        'common.change': 'Değişim',
        'common.volume': 'Hacim',
        'common.marketCap': 'Piyasa Değeri',
        'common.peRatio': 'F/K Oranı',

        // FAQ
        'faq.title': 'SSS & Metodoloji',
        'faq.fairValueExplanation': 'Adil Değer Nasıl Hesaplanır?',
        'faq.dataSources': 'Veri Kaynakları',
        'faq.assumptions': 'Varsayımlar',
        'faq.limitations': 'Sınırlamalar',
        'faq.disclaimers': 'Uyarılar',
    }
};

/**
 * Get translation for a key
 */
export function t(key: string, locale: string = 'en-GB'): string {
    const dict = translations[locale] || translations['en-GB'];
    return dict[key] || translations['en-GB'][key] || key;
}

/**
 * Format number according to locale
 */
export function formatNumber(value: number, locale: string = 'en-GB', options?: Intl.NumberFormatOptions): string {
    const localeMap: Record<string, string> = {
        'en-GB': 'en-GB',
        'tr-TR': 'tr-TR'
    };
    const actualLocale = localeMap[locale] || 'en-GB';
    return new Intl.NumberFormat(actualLocale, options).format(value);
}

/**
 * Format date according to locale
 */
export function formatDate(date: Date | string, locale: string = 'en-GB', format: 'short' | 'medium' | 'long' = 'medium'): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    const localeMap: Record<string, string> = {
        'en-GB': 'en-GB',
        'tr-TR': 'tr-TR'
    };
    const actualLocale = localeMap[locale] || 'en-GB';

    const formatOptions: Record<string, Intl.DateTimeFormatOptions> = {
        short: { day: 'numeric', month: 'numeric', year: '2-digit' },
        medium: { day: 'numeric', month: 'short', year: 'numeric' },
        long: { day: 'numeric', month: 'long', year: 'numeric', weekday: 'long' }
    };
    const options = formatOptions[format] || formatOptions.medium;

    return new Intl.DateTimeFormat(actualLocale, options).format(d);
}

/**
 * Format currency according to locale and currency code
 */
export function formatCurrency(
    value: number,
    currency: string = 'GBP',
    locale: string = 'en-GB'
): string {
    const localeMap: Record<string, string> = {
        'en-GB': 'en-GB',
        'tr-TR': 'tr-TR'
    };
    const actualLocale = localeMap[locale] || 'en-GB';

    // Manual symbol handling for better consistency
    const symbols: Record<string, string> = {
        'GBP': '£',
        'USD': '$',
        'EUR': '€',
        'TRY': '₺'
    };

    const symbol = symbols[currency] || currency;

    // Format number
    let formatted: string;
    if (currency === 'TRY' && Math.abs(value) >= 100) {
        // Turkish Lira: no decimals for large values
        formatted = formatNumber(value, locale, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
    } else {
        formatted = formatNumber(value, locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    return `${symbol}${formatted}`;
}

/**
 * Format percentage
 */
export function formatPercent(value: number, locale: string = 'en-GB', showSign: boolean = true): string {
    const sign = showSign && value > 0 ? '+' : '';
    return `${sign}${formatNumber(value, locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
}

/**
 * Get supported locales
 */
export const SUPPORTED_LOCALES = [
    { code: 'en-GB', name: 'English', flag: '🇬🇧' },
    { code: 'tr-TR', name: 'Türkçe', flag: '🇹🇷' }
];

/**
 * Get supported currencies
 */
export const SUPPORTED_CURRENCIES = [
    { code: 'GBP', symbol: '£', name: 'British Pound' },
    { code: 'USD', symbol: '$', name: 'US Dollar' },
    { code: 'EUR', symbol: '€', name: 'Euro' },
    { code: 'TRY', symbol: '₺', name: 'Turkish Lira' }
];

export default translations;
