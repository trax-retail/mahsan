'use strict';

module.exports = {
    extends: 'standard',
    rules: {
        semi: ['error', 'always'],
        'space-before-function-paren': ['error', {
            anonymous: 'always',
            named: 'never',
            asyncArrow: 'always'
        }],
        'no-return-await': ['off'],
        indent: ['error', 4]
    }
};
