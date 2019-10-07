import '@storybook/addon-console'
import { configure } from '@storybook/polymer'

const req = require.context('../stories', true, /\.stories\.js$/)
const loadStories = () => req.keys().forEach(filename => req(filename))

configure(loadStories, module)
