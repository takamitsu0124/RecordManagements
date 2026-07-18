import js from '@eslint/js'
import globals from 'globals'
import pluginVue from 'eslint-plugin-vue'
import {
  defineConfigWithVueTs,
  vueTsConfigs
} from '@vue/eslint-config-typescript'
import stylistic from '@stylistic/eslint-plugin'

export default defineConfigWithVueTs(
  {
    ignores: [
      'dist/**',
      '.quasar/**',
      'src-bex/www/**',
      'src-capacitor/**',
      'src-cordova/**',
      'src-ssr/**',
      'quasar.config.*.temporary.compiled*'
    ]
  },

  js.configs.recommended,
  pluginVue.configs['flat/recommended'],

  {
    files: ['**/*.ts', '**/*.vue'],
    rules: {
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports' }
      ]
    }
  },

  vueTsConfigs.recommendedTypeChecked,

  {
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.node,
        process: 'readonly',
        ga: 'readonly',
        cordova: 'readonly',
        Capacitor: 'readonly',
        chrome: 'readonly',
        browser: 'readonly',
        __statics: 'readonly',
        __QUASAR_SSR__: 'readonly',
        __QUASAR_SSR_SERVER__: 'readonly',
        __QUASAR_SSR_CLIENT__: 'readonly',
        __QUASAR_SSR_PWA__: 'readonly'
      }
    },
    plugins: {
      '@stylistic': stylistic
    },
    rules: {
      '@stylistic/type-annotation-spacing': 'error',
      '@stylistic/semi': ['error', 'never'],
      '@stylistic/comma-dangle': ['error', 'never'],
      eqeqeq: ['error', 'always', { null: 'ignore' }],
      'no-debugger': process.env.NODE_ENV === 'production' ? 'error' : 'off',
      'no-var': 'error',
      'prefer-const': ['error', { destructuring: 'all' }],
      'prefer-template': 'error',
      'object-shorthand': ['error', 'always'],
      'dot-notation': 'error',
      'no-implicit-coercion': 'off',
      'default-case': 'error',
      'no-useless-escape': 'error',
      'no-inner-declarations': 'error',
      'no-empty-pattern': 'error',
      'no-async-promise-executor': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }
      ],
      '@typescript-eslint/no-unused-expressions': [
        'error',
        { allowShortCircuit: false, allowTernary: false }
      ],
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/strict-boolean-expressions': [
        'off',
        { allowString: false, allowNumber: false }
      ],
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
      '@typescript-eslint/no-non-null-assertion': 'error',
      '@typescript-eslint/no-redundant-type-constituents': 'error',
      '@typescript-eslint/no-unnecessary-type-assertion': 'error',
      '@typescript-eslint/consistent-type-definitions': ['error', 'type'],
      '@typescript-eslint/explicit-member-accessibility': [
        'error',
        { overrides: { constructors: 'no-public' } }
      ],
      '@typescript-eslint/method-signature-style': ['error', 'property'],
      '@typescript-eslint/prefer-readonly': 'error',
      '@typescript-eslint/promise-function-async': 'off',
      'vue/no-mutating-props': 'error',
      'vue/no-v-html': 'off',
      'vue/require-default-prop': 'error',
      'vue/require-explicit-emits': 'error',
      'vue/no-template-shadow': 'error',
      'vue/attributes-order': 'error',
      'vue/max-attributes-per-line': 'off',
      'vue/html-indent': ['off', 2],
      'vue/multiline-html-element-content-newline': 'error',
      'vue/singleline-html-element-content-newline': 'off',
      'vue/html-self-closing': [
        'error',
        {
          html: { void: 'always', normal: 'always', component: 'always' }
        }
      ],
      'vue/v-on-event-hyphenation': ['error', 'never', { autofix: true }],
      'vue/html-closing-bracket-newline': 'error',
      'vue/block-order': ['error', { order: ['script', 'template', 'style'] }],
      'vue/v-slot-style': 'error',
      'vue/attribute-hyphenation': ['error', 'never'],
      'vue/prop-name-casing': ['error', 'camelCase'],
      'vue/multi-word-component-names': 'off',
      'prefer-promise-reject-errors': 'off'
    }
  }
)
