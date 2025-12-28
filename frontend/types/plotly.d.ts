// Type declarations for react-plotly.js
declare module 'react-plotly.js' {
    import { Component } from 'react';

    interface PlotParams {
        data: any[];
        layout?: any;
        config?: any;
        frames?: any[];
        style?: React.CSSProperties;
        className?: string;
        useResizeHandler?: boolean;
        debug?: boolean;
        onInitialized?: (figure: any, graphDiv: HTMLElement) => void;
        onUpdate?: (figure: any, graphDiv: HTMLElement) => void;
        onPurge?: (figure: any, graphDiv: HTMLElement) => void;
        onError?: (err: Error) => void;
        divId?: string;
        revision?: number;
        onSelected?: (event: any) => void;
        onHover?: (event: any) => void;
        onUnhover?: (event: any) => void;
        onClick?: (event: any) => void;
    }

    export default class Plot extends Component<PlotParams> { }
}

// Type declarations for plotly.js
declare module 'plotly.js' {
    export interface Data {
        type?: string;
        values?: number[];
        labels?: string[];
        x?: (string | number)[];
        y?: (string | number)[];
        mode?: string;
        name?: string;
        marker?: {
            colors?: string[];
            color?: string | string[];
            size?: number | number[];
        };
        line?: {
            color?: string;
            width?: number;
            dash?: string;
        };
        hole?: number;
        textinfo?: string;
        textposition?: string;
        textfont?: {
            color?: string;
            size?: number;
        };
        hovertemplate?: string;
        fill?: string;
        fillcolor?: string;
    }

    export interface Layout {
        title?: string | { text: string };
        showlegend?: boolean;
        legend?: {
            orientation?: string;
            x?: number;
            y?: number;
            font?: {
                color?: string;
                size?: number;
            };
        };
        paper_bgcolor?: string;
        plot_bgcolor?: string;
        margin?: {
            t?: number;
            b?: number;
            l?: number;
            r?: number;
        };
        height?: number;
        width?: number;
        xaxis?: {
            title?: string;
            showgrid?: boolean;
            gridcolor?: string;
            tickfont?: { color?: string };
            color?: string;
        };
        yaxis?: {
            title?: string;
            showgrid?: boolean;
            gridcolor?: string;
            tickfont?: { color?: string };
            color?: string;
            tickformat?: string;
        };
        annotations?: Array<{
            text: string;
            x: number;
            y: number;
            font?: {
                size?: number;
                color?: string;
                family?: string;
            };
            showarrow?: boolean;
        }>;
        hovermode?: string;
    }

    export interface Config {
        displayModeBar?: boolean;
        responsive?: boolean;
        displaylogo?: boolean;
    }

    export interface Frame {
        name: string;
        data: Data[];
        layout?: Partial<Layout>;
    }

    export interface PlotMouseEvent {
        points: Array<{
            x: number | string;
            y: number | string;
            pointIndex: number;
            curveNumber: number;
            data: Data;
        }>;
        event: MouseEvent;
    }

    export interface PlotSelectionEvent {
        points: Array<{
            x: number | string;
            y: number | string;
            pointIndex: number;
            curveNumber: number;
        }>;
    }
}
