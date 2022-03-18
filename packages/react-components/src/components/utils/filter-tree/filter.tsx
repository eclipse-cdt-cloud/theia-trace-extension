import * as React from 'react';

interface FilterProps {
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

interface FilterState {
    width: number
}
export class Filter extends React.Component<FilterProps, FilterState> {

    private ref: React.RefObject<HTMLDivElement>;
    private resizeObserver: ResizeObserver;

    constructor(props: FilterProps) {
        super(props);
        this.ref = React.createRef();
        this.state = {
            width: 0
        };
        this.resizeObserver = new ResizeObserver(entries => {
            this.setState({
                width: entries[0].contentRect.width
            });
        });
    }

    componentDidMount(): void {
        const header = this.ref.current?.parentElement?.querySelector('th');
        if (header) {
            this.resizeObserver.observe(header);
        }
    }

    componentWillUnmount(): void {
        this.resizeObserver.disconnect();
    }

    render(): JSX.Element {
        return <div ref={this.ref} onChange={this.props.onChange}>
            <input
                id="input-filter-tree"
                type="text"
                placeholder="Filter"
                style={{width: this.state.width}}
            />
        </div>;
    }
}
