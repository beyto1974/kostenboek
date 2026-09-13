import { render } from 'solid-js/web';
import { App } from './ui/App';
import './ui/app.css';

const mount = document.getElementById('app');
if (!mount) throw new Error('The page is missing its #app element.');

render(() => <App />, mount);
