import React from 'react';

declare global {
    namespace JSX {
        interface IntrinsicElements {
            'gmp-place-autocomplete': React.DetailedHTMLProps<
                React.HTMLAttributes<HTMLElement> & {
                    'included-primary-types'?: string;
                    placeholder?: string;
                },
                HTMLElement
            >;
        }
    }
}
