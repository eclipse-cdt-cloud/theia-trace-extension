import * as React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronDown, faChevronRight, faCheckSquare, faSquare, faMinusSquare } from '@fortawesome/free-solid-svg-icons';

interface iconsShape {
    expand: React.ReactNode,
    collapse: React.ReactNode,
    unchecked: React.ReactNode,
    checked: React.ReactNode,
    halfChecked: React.ReactNode
}

const icons: iconsShape = {
    expand: <FontAwesomeIcon icon={faChevronRight}/>,
    collapse: <FontAwesomeIcon icon={faChevronDown}/>,
    unchecked: <FontAwesomeIcon icon={faSquare}/>,
    checked: <FontAwesomeIcon icon={faCheckSquare}/>,
    halfChecked: <FontAwesomeIcon icon={faMinusSquare}/>
};

export default icons;
