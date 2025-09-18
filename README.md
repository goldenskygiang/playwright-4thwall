# Breaking the 4th wall of Playwright

A fully automated, interactive, end-to-end test of the [File System Access API](https://developer.chrome.com/docs/capabilities/web-apis/file-system-access), using the [Text-Editor](https://googlechromelabs.github.io/text-editor/) web demo.

## Run locally

```sh
python -m venv venv
source venv/bin/activate
pip install -r keyboard_ctrl_server/requirements.txt
python keyboard_ctrl_server/main.py
```

Open a new terminal to run the Playwright test separately

```sh
npm install
npx playwright install --with-deps
npx playwright test
```

## Headless run

```sh
docker build -t playwright-4thwall .
docker run --rm playwright-4thwall ./start.sh
```

## Interactive run with VNC

```sh
docker build -t playwright-4thwall .
docker run -p 5901:5901 --rm playwright-4thwall ./start.sh desktop
```

Connect your VNC client to `vnc://localhost:5901` and password `password`.

Then open a terminal in the `/app` folder and run `npx playwright test`.