/***************************************************************************************
 * Copyright (c) 2023 BlackBerry Limited and contributors.
 *
 * Licensed under the MIT license. See LICENSE file in the project root for details.
 ***************************************************************************************/

import React from 'react';
import { AbstractOutputProps } from './abstract-output-component';

export enum OptionType {
    DEFAULT,
    CHECKBOX
}

export interface OptionState {
    type: OptionType;
    label: string;
    condition?: () => boolean;
    onClick?: (arg?: unknown) => void;
    arg?: () => unknown;
    subSection?: DropDownSubSection; // Contains a list of options for a subsection
}

export interface DropDownSubSection {
    options: OptionState[]; // Contains a list of options for a subsection
    condition: () => boolean;
    height?: number;
}

type OptionProps = AbstractOutputProps & OptionState;

abstract class AbstractDropDownOption<P extends OptionProps, S extends OptionState> extends React.Component<P, S> {
    constructor(props: P) {
        super(props);
    }
}

export class DropDownOption extends AbstractDropDownOption<OptionProps, OptionState> {
    constructor(props: OptionProps) {
        super(props);
        this.state = {
            type: OptionType.DEFAULT,
            label: props.label,
            onClick: props.onClick ?? undefined,
            arg: props.arg ?? undefined,
            condition: props.condition ?? (() => true)
        };
    }

    render(): JSX.Element {
        return (
            <React.Fragment>
                {this.state.condition?.() && (
                    <li className="drop-down-list-item" onClick={() => this.state.onClick?.(this.state.arg?.())}>
                        <div className="drop-down-list-item-text">{this.state.label}</div>
                    </li>
                )}
            </React.Fragment>
        );
    }
}

export type OptionCheckBoxState = OptionState & {
    checked: () => boolean;
};

type OptionCheckBoxProps = OptionProps & OptionCheckBoxState;

export class DropDownOptionCheckBox extends AbstractDropDownOption<OptionCheckBoxProps, OptionCheckBoxState> {
    constructor(props: OptionCheckBoxProps) {
        super(props);
        this.state = {
            type: OptionType.CHECKBOX,
            label: props.label,
            checked: props.checked,
            onClick: props.onClick ?? undefined,
            arg: props.arg ?? undefined,
            condition: props.condition ?? (() => true)
        };
    }

    render(): JSX.Element {
        return (
            <React.Fragment>
                {this.state.condition?.() && (
                    <li className="drop-down-list-item" onClick={() => this.state.onClick?.(this.state.arg?.())}>
                        <div className="drop-down-list-item-checkbox">
                            <input type="checkbox" checked={this.state.checked()} />
                        </div>
                        <div className="drop-down-list-item-checkbox-label">{this.state.label}</div>
                    </li>
                )}
            </React.Fragment>
        );
    }
}

type DropDownProps = AbstractOutputProps & {
    dropDownOptions: OptionState[];
    dropDownOpen: boolean;
};

export class DropDownComponent extends React.Component<DropDownProps> {
    public optionsMenuRef: React.RefObject<HTMLDivElement>;

    constructor(props: DropDownProps) {
        super(props);
        this.optionsMenuRef = React.createRef();
    }

    render(): JSX.Element {
        return (
            <React.Fragment>
                {this.props.dropDownOpen && (
                    <div className="options-menu-drop-down" ref={this.optionsMenuRef}>
                        <ul>{this.props.dropDownOptions?.map((option, index) => this.renderSection(option, index))}</ul>
                    </div>
                )}
            </React.Fragment>
        );
    }

    renderSection(option: OptionState, index: number): React.ReactNode {
        if (option.subSection && option.subSection.options.length > 0) {
            return (
                <React.Fragment>
                    {
                        // Rendering the upper level option label
                        this.renderOption(option, index)
                    }
                    {option.subSection.condition?.() && (
                        <ul
                            className="drop-down-sub-section"
                            style={{ height: option.subSection.height ? option.subSection.height + 'px' : 'auto' }}
                        >
                            {
                                // Rendering the sub section
                                option.subSection.options.map((subOption, subOptionIndex) =>
                                    this.renderOption(subOption, subOptionIndex)
                                )
                            }
                        </ul>
                    )}
                </React.Fragment>
            );
        } else {
            return this.renderOption(option, index);
        }
    }

    renderOption(option: OptionState, index: number): React.ReactNode {
        if (option.type === OptionType.CHECKBOX) {
            const checkboxOptions = option as OptionCheckBoxState;
            return (
                <React.Fragment>
                    <DropDownOptionCheckBox {...this.props} key={index} {...checkboxOptions} />
                </React.Fragment>
            );
        } else {
            return (
                <React.Fragment>
                    <DropDownOption {...this.props} key={index} {...option} />
                </React.Fragment>
            );
        }
    }
}
