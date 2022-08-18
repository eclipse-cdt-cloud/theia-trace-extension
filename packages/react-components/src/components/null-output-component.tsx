import * as React from 'react';
import { ResponseStatus } from 'tsp-typescript-client';
import { AbstractOutputComponent, AbstractOutputProps, AbstractOutputState } from './abstract-output-component';

type NullOutputState = AbstractOutputState & {
};

type NullOutputProps = AbstractOutputProps & {
};

export class NullOutputComponent extends AbstractOutputComponent<NullOutputProps, NullOutputState> {
    constructor(props: NullOutputProps) {
        super(props);
        this.state = {
            outputStatus: ResponseStatus.COMPLETED
        };
    }

    renderMainArea(): React.ReactNode {
        return <React.Fragment>
            <div className='message-main-area'>
                Not implemented yet!
                <br />
            </div>
        </React.Fragment>;
    }

    resultsAreEmpty(): boolean {
        return false;
    }

    setFocus(): void {
        return;
    }
  }
