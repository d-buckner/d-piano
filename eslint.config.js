import js from '@eslint/js';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import importPlugin from 'eslint-plugin-import';


export default [
	{
		ignores: ['build/**', 'build/'], // Add this at the beginning
	},
	js.configs.recommended,
	{
		files: ['**/*.{js,ts,tsx}'],
		languageOptions: {
			parser: tsParser,
			ecmaVersion: 2017,
			sourceType: 'module',
			globals: {
				Piano: true,
				Tone: true,
				console: true,
				process: true,
				Buffer: true,
			},
		},
		plugins: {
			'@typescript-eslint': tsPlugin,
			import: importPlugin,
		},
		rules: {
			'dot-location': ['error', 'property'],
			'linebreak-style': ['error', 'unix'],
			eqeqeq: ['error'],
			curly: ['error', 'all'],
			'dot-notation': ['error'],
			'no-throw-literal': ['error'],
			'no-useless-call': ['error'],
			'no-unmodified-loop-condition': ['error'],
			'quote-props': ['error', 'as-needed'],
			quotes: ['error', 'single'],
			'no-lonely-if': ['error'],
			semi: ['error', 'always'], // Changed to always

			// Import rules
			'@typescript-eslint/consistent-type-imports': ['error', {
				prefer: 'type-imports',
				fixStyle: 'separate-type-imports',
			}],
			'import/order': ['error', {
				groups: [
					'builtin',
					'external',
					'internal',
					'parent',
					'sibling',
					'index',
					'type',
				],
				'newlines-between': 'always',
			}],
			'import/newline-after-import': ['error', { count: 2 }],

			// Style rules
			indent: ['error', 'tab', { SwitchCase: 1 }],
			'no-multi-spaces': ['error'],
			'array-bracket-spacing': ['error', 'never'],
			'block-spacing': ['error', 'always'],
			'func-call-spacing': ['error', 'never'],
			'key-spacing': ['error', {
				beforeColon: false,
				afterColon: true,
			}],
			'brace-style': ['error', '1tbs'],
			'space-in-parens': ['error', 'never'],
			'eol-last': ['error', 'always'],
			'lines-between-class-members': ['error', 'always'],
			'no-multiple-empty-lines': ['error', {
				max: 2,
				maxEOF: 1,
				maxBOF: 0,
			}],
			'no-unneeded-ternary': ['error'],
			'object-curly-spacing': ['error', 'always'],
			'space-unary-ops': ['error', {
				words: true,
				nonwords: false,
			}],
			'keyword-spacing': ['error', { before: true }],
			'space-before-function-paren': ['error', {
				anonymous: 'never',
				named: 'never',
				asyncArrow: 'always',
			}],
			'comma-spacing': ['error', {
				before: false,
				after: true,
			}],
			'space-before-blocks': ['error', 'always'],
			// Trailing commas
			'comma-dangle': ['error', {
				imports: 'always-multiline',
				exports: 'always-multiline',
				arrays: 'always-multiline',
				objects: 'always-multiline',
				functions: 'never',
			}],
		},
	},
];
