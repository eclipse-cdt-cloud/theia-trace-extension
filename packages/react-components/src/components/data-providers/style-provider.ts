/* eslint-disable @typescript-eslint/no-explicit-any */
import { TspClient } from 'tsp-typescript-client/lib/protocol/tsp-client';
import { QueryHelper } from 'tsp-typescript-client/lib/models/query/query-helper';
import { OutputStyleModel, OutputElementStyle } from 'tsp-typescript-client/lib/models/styles';
import { StyleProperties } from './style-properties';

export class StyleProvider {
    private tspClient: TspClient;
    private traceId: string;
    private outputId: string;

    private tmpStyleObject: { [key: string]: { [key: string]: { [key: string]: any } } };

    private styleModel: OutputStyleModel | undefined;

    constructor(outputId: string, traceId: string, tspClient: TspClient) {
        this.outputId = outputId;
        this.tspClient = tspClient;
        this.traceId = traceId;
        const threadStyleObject = {
            '0': {
                color: '646464',
                height: 0.33
            },
            '2': {
                color: '00C800',
                height: 1
            },
            '3': {
                color: '0000C8',
                height: 1
            },
            '4': {
                color: 'C80064',
                height: 0.75
            },
            '1': {
                color: 'C8C800',
                height: 0.5
            },
            '5': {
                color: 'C86400',
                height: 0.5
            },
            '6': {
                color: 'C8C8C8',
                height: 0.5
            }
        };

        const resourceStyleObject = {
            '0': {
                color: 'C8C8C8',
                height: 0.66
            },
            '2': {
                color: '00C800',
                height: 1
            },
            '4': {
                color: '0000C8',
                height: 1
            },
            '16': {
                color: 'C80064',
                height: 0.75
            },
            '8': {
                color: 'C89664',
                height: 1
            },
            '1': {
                color: 'C8C800',
                height: 1
            }
        };
        this.tmpStyleObject = {
            'org.eclipse.tracecompass.internal.analysis.os.linux.core.threadstatus.ThreadStatusDataProvider':
                threadStyleObject,
            'org.eclipse.tracecompass.internal.analysis.os.linux.core.threadstatus.ResourcesStatusDataProvider':
                resourceStyleObject
        };
    }

    /**
     * Get the style model for a specific output
     * @param forceUpdate Force the update of the current cached style model from the server
     */
    public async getStyleModel(forceUpdate?: boolean): Promise<OutputStyleModel | undefined> {
        if (!this.styleModel || forceUpdate) {
            const tspClientResponse = await this.tspClient.fetchStyles(
                this.traceId,
                this.outputId,
                QueryHelper.query()
            );
            const styleResponse = tspClientResponse.getModel();
            if (tspClientResponse.isOk() && styleResponse) {
                this.styleModel = styleResponse.model;
            }
        }
        return this.styleModel;
    }

    public getStylesTmp(_forceUpdate?: boolean): { [key: string]: { [key: string]: any } } {
        const styles = this.tmpStyleObject[this.outputId];
        return styles ? styles : {};
    }

    /**
     * Get the style property value for the specified element style. The style
     * hierarchy is traversed until a value is found.
     *
     * @param elementStyle
     *            the style
     * @param property
     *            the style property
     * @return the style property value, or undefined
     */
    public getStyle(elementStyle: OutputElementStyle, property: string): any | undefined {
        let style: OutputElementStyle | undefined = elementStyle;
        const styleQueue: string[] = [];
        while (style !== undefined) {
            const styleValues = style.values ? style.values : {};
            const value = styleValues[property];
            if (value) {
                return value;
            }

            // Get the next style
            style = this.popNextStyle(style, styleQueue);
        }
        return undefined;
    }

    /**
     * Get the style property number value for the specified element style. The
     * style hierarchy is traversed until a number value is found, and the
     * returned number value will be multiplied by the first
     * StyleProperties.FACTOR suffixed modifier style that was found
     * along the way, if any.
     *
     * @param elementStyle
     *            the style
     * @param property
     *            the style property
     * @return the style property number value, or undefined
     */
    public getNumberStyle(elementStyle: OutputElementStyle, property: string): number | undefined {
        let factor = undefined;
        let style: OutputElementStyle | undefined = elementStyle;
        const styleQueue: string[] = [];
        while (style) {
            const styleValues = style.values ? style.values : {};
            if (factor === undefined) {
                const factorValue = styleValues[property + StyleProperties.FACTOR];
                if (typeof factorValue === 'number') {
                    factor = factorValue as number;
                }
            }
            const value = styleValues[property];
            if (typeof value === 'number') {
                const numberValue = value as number;
                return factor === undefined ? numberValue : factor * numberValue;
            }

            // Get the next style
            style = this.popNextStyle(style, styleQueue);
        }
        return factor;
    }

    /**
     * Get the style property color value for the specified element style. The
     * style hierarchy is traversed until a color and opacity value is found,
     * and the returned color value will be blended with the first
     * StyleProperties.BLEND suffixed modifier style that was found
     * along the way, if any.
     *
     * @param elementStyle
     *            the style
     * @param property
     *            the style property
     * @return the style property color value, or undefined
     */
    public getColorStyle(
        elementStyle: OutputElementStyle,
        property: string
    ): { color: number; alpha: number } | undefined {
        let color: string | undefined = undefined;
        let opacity: number | undefined = undefined;
        let blend = undefined;
        let style: OutputElementStyle | undefined = elementStyle;
        const styleQueue: string[] = [];
        while (style) {
            const styleValues = style.values ? style.values : {};
            if (blend === undefined) {
                const blendValue = styleValues[property + StyleProperties.BLEND];
                if (typeof blendValue === 'string') {
                    blend = this.rgbaStringToColor(blendValue as string);
                }
            }
            if (opacity === undefined) {
                const opacityValue = styleValues[StyleProperties.OPACITY];
                if (typeof opacityValue === 'number') {
                    opacity = opacityValue as number;
                    if (color) {
                        break;
                    }
                }
            }
            if (color === undefined) {
                const value = styleValues[property];
                if (typeof value === 'string') {
                    color = value as string;
                    if (opacity) {
                        break;
                    }
                }
            }

            // Get the next style
            style = this.popNextStyle(style, styleQueue);
        }
        const alpha = opacity === undefined ? 1.0 : opacity;
        const rgba =
            color === undefined
                ? opacity === undefined
                    ? undefined
                    : this.rgbaToColor(0, 0, 0, alpha)
                : this.rgbStringToColor(color, alpha);
        return rgba === undefined ? undefined : blend === undefined ? rgba : this.blend(rgba, blend);
    }

    private popNextStyle(style: OutputElementStyle, styleQueue: string[]): OutputElementStyle | undefined {
        // Get the next style
        let nextStyle = undefined;
        const parentKey = style.parentKey;
        if (parentKey) {
            const split = parentKey.split(',');
            split.forEach(styleKey => styleQueue.push(styleKey));
        }
        while (nextStyle === undefined && styleQueue.length !== 0) {
            const nextKey = styleQueue.pop();
            if (nextKey) {
                nextStyle = this.styleModel?.styles[nextKey];
            }
        }

        return nextStyle;
    }

    private blend(
        color1: { color: number; alpha: number },
        color2: { color: number; alpha: number }
    ): { color: number; alpha: number } {
        /**
         * If a color component 'c' with alpha 'a' is blended with color
         * component 'd' with alpha 'b', the blended color and alpha are:
         *
         * <pre>
         * color = (a*(1-b)*c + b*d) / (a + b - a*b)
         * alpha = (a + b - a*b)
         * </pre>
         */
        const alpha = color1.alpha + color2.alpha - color1.alpha * color2.alpha;
        const r = this.blendComponent(
            color1.alpha,
            (color1.color >> 16) & 0xff,
            color2.alpha,
            (color2.color >> 16) & 0xff,
            alpha
        );
        const g = this.blendComponent(
            color1.alpha,
            (color1.color >> 8) & 0xff,
            color2.alpha,
            (color2.color >> 8) & 0xff,
            alpha
        );
        const b = this.blendComponent(color1.alpha, color1.color & 0xff, color2.alpha, color2.color & 0xff, alpha);
        return this.rgbaToColor(r, g, b, alpha);
    }

    private blendComponent(alpha1: number, color1: number, alpha2: number, color2: number, alpha: number): number {
        return Math.floor((alpha1 * (1.0 - alpha2) * color1 + alpha2 * color2) / alpha);
    }

    private rgbStringToColor(rgbString: string, alpha: number): { color: number; alpha: number } {
        const color = parseInt(rgbString.replace(/^#/, ''), 16);
        return { color, alpha };
    }

    private rgbaStringToColor(rgbaString: string): { color: number; alpha: number } {
        const int = parseInt(rgbaString.replace(/^#/, ''), 16);
        const color = (int >> 8) & 0xffffff;
        const alpha = (int & 0xff) / 255;
        return { color, alpha };
    }

    private rgbaToColor(r: number, g: number, b: number, alpha: number): { color: number; alpha: number } {
        const color = (r << 16) + (g << 8) + b;
        return { color, alpha };
    }
}
