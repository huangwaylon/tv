# TVer Subtitle Extractor

A Firefox browser extension that extracts closed captions from Japanese TVer videos and renders them as selectable text, making them compatible with language learning tools like 10ten Japanese Reader.

## Features

- Extracts and displays Japanese subtitles from TVer videos as selectable text overlay
- Hides native subtitle elements to prevent duplicate subtitles
- Toggle on/off functionality via a popup UI
- Works in both normal and fullscreen video modes
- Persists user preferences across browser sessions

## Installation

### Temporary Installation (for Development)

1. Clone or download this repository
2. Open Firefox and navigate to `about:debugging`
3. Click "This Firefox"
4. Click "Load Temporary Add-on"
5. Select any file from the extension directory (e.g., `manifest.json`)

### Permanent Installation

The extension will be submitted to the Firefox Add-ons store. Once approved, you can install it directly from there.

## Usage

1. Navigate to a TVer video page (e.g., https://tver.jp/episodes/eppv6g4pj2)
2. Click the TVer Subtitle Extractor icon in the Firefox toolbar
3. Toggle the switch to enable or disable the subtitle extraction
4. When enabled, subtitles will appear as selectable text over the video
5. You can now select and copy subtitle text, or use language learning tools like 10ten Japanese Reader to interact with them

## How It Works

The extension:
1. Detects when you're on a TVer video page
2. Finds the video player and subtitle elements
3. Extracts the subtitle text from the native subtitle elements
4. Creates a selectable text overlay that follows the video, even in fullscreen mode
5. Hides the original subtitle elements to prevent duplication

## Limitations

- The extension currently works only on TVer.jp
- It relies on specific DOM selectors which might change if TVer updates their site
- Subtitle timing may occasionally be slightly off from the original

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgements

- Thanks to TVer for providing Japanese content with subtitles
- Inspired by similar projects for other streaming platforms 