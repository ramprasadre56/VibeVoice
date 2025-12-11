"""VibeVoice - Speechify-like TTS Web Application."""

import reflex as rx

from .state import AppState
from .components.sidebar import sidebar
from .components.header import header
from .components.file_card import file_card, file_list_item
from .components.audio_player import audio_player
from .components.voice_picker import voice_picker
from .components.modals import add_text_modal, add_link_modal, settings_modal
from .components.podcasts_page import podcasts_page
from .components.create_podcast_modal import create_podcast_modal


def empty_state() -> rx.Component:
    """Empty state when no items in library."""
    return rx.center(
        rx.vstack(
            rx.center(
                rx.icon("library", size=64, color="var(--gray-7)"),
                width="120px",
                height="120px",
                background="var(--gray-3)",
                border_radius="24px",
            ),
            rx.heading(
                "Your library is empty",
                size="5",
                color="var(--gray-11)",
            ),
            rx.text(
                "Add your first item by clicking one of the buttons above",
                size="3",
                color="var(--gray-9)",
                text_align="center",
            ),
            rx.hstack(
                rx.button(
                    rx.icon("type", size=16),
                    "Add Text",
                    variant="solid",
                    color_scheme="orange",
                    size="3",
                    on_click=AppState.toggle_add_text_modal,
                ),
                rx.button(
                    rx.icon("link", size=16),
                    "Add Link",
                    variant="soft",
                    color_scheme="gray",
                    size="3",
                    on_click=AppState.toggle_add_link_modal,
                ),
                spacing="3",
            ),
            spacing="4",
            align="center",
            padding="60px",
        ),
        width="100%",
        min_height="400px",
    )


def library_grid() -> rx.Component:
    """Grid view of library items."""
    return rx.box(
        rx.cond(
            AppState.items.length() > 0,
            rx.flex(
                rx.foreach(AppState.items, file_card),
                wrap="wrap",
                spacing="4",
            ),
            empty_state(),
        ),
        width="100%",
    )


def library_list() -> rx.Component:
    """List view of library items."""
    return rx.box(
        rx.cond(
            AppState.items.length() > 0,
            rx.vstack(
                rx.foreach(AppState.items, file_list_item),
                spacing="2",
                width="100%",
            ),
            empty_state(),
        ),
        width="100%",
    )


def library_content() -> rx.Component:
    """Library content area with items."""
    return rx.box(
        rx.cond(
            AppState.view_mode == "grid",
            library_grid(),
            library_list(),
        ),
        padding="24px",
        padding_bottom="100px",
        width="100%",
        min_height="calc(100vh - 80px)",
    )


def main_content() -> rx.Component:
    """Main content area - switches based on current page."""
    return rx.box(
        rx.cond(
            AppState.current_page == "library",
            rx.fragment(
                header(),
                library_content(),
            ),
            rx.fragment(
                # Podcasts header
                rx.box(
                    rx.hstack(
                        rx.heading("Podcasts", size="6", weight="bold"),
                        rx.spacer(),
                        # Connection status
                        rx.tooltip(
                            rx.box(
                                rx.box(
                                    width="8px",
                                    height="8px",
                                    border_radius="50%",
                                    background=rx.cond(
                                        AppState.is_connected,
                                        "#22c55e",
                                        "#ef4444"
                                    ),
                                ),
                            ),
                            content=AppState.connection_status,
                        ),
                        rx.avatar(fallback="U", size="2", radius="full"),
                        spacing="4",
                        align="center",
                        width="100%",
                    ),
                    padding="16px 24px",
                    background="var(--gray-1)",
                    border_bottom="1px solid var(--gray-4)",
                ),
                podcasts_page(),
            ),
        ),
        width="100%",
    )


def audio_script() -> rx.Component:
    """JavaScript for audio playback - triggers when state changes."""
    return rx.script(
        """
        (function() {
            let lastPlayState = false;
            let playbackTriggered = false;
            
            function checkPlayback() {
                const isPlayingEl = document.getElementById('is-playing-state');
                const textEl = document.getElementById('audio-text-state');
                const serverEl = document.getElementById('audio-server-state');
                const voiceEl = document.getElementById('audio-voice-state');
                
                if (!isPlayingEl) return;
                
                const isPlaying = isPlayingEl.dataset.value === 'true';
                const text = textEl ? textEl.dataset.value : '';
                const server = serverEl ? serverEl.dataset.value : '';
                const voice = voiceEl ? voiceEl.dataset.value : '';
                
                if (isPlaying && !lastPlayState) {
                    if (text && server) {
                        console.log('[VibeVoice] Play state changed: Starting playback');
                        if (window.startVibeVoiceTTS) {
                            window.startVibeVoiceTTS(server, text, voice);
                        }
                        playbackTriggered = true;
                    }
                } 
                else if (!isPlaying && lastPlayState) {
                    console.log('[VibeVoice] Play state changed: Stopping playback');
                    if (window.stopVibeVoiceTTS) {
                        window.stopVibeVoiceTTS();
                    }
                    playbackTriggered = false;
                }
                
                lastPlayState = isPlaying;
            }
            
            setInterval(checkPlayback, 100);
        })();
        """
    )


def hidden_state_elements() -> rx.Component:
    """Hidden elements to pass state to JavaScript."""
    return rx.fragment(
        rx.box(
            id="is-playing-state",
            data_value=rx.cond(AppState.is_playing, "true", "false"),
            display="none",
        ),
        rx.box(
            id="audio-text-state",
            data_value=AppState.audio_text_to_play,
            display="none",
        ),
        rx.box(
            id="audio-server-state",
            data_value=AppState.audio_server_url,
            display="none",
        ),
        rx.box(
            id="audio-voice-state",
            data_value=AppState.audio_voice,
            display="none",
        ),
    )


def index() -> rx.Component:
    """Main application page."""
    return rx.box(
        # Load audio player JavaScript
        rx.script(src="/audio_player.js"),
        
        # Hidden state elements for JavaScript
        hidden_state_elements(),
        
        # Audio playback trigger script
        audio_script(),
        
        # Sidebar
        sidebar(),
        
        # Main area
        rx.box(
            main_content(),
            margin_left="220px",
            width="calc(100% - 220px)",
            min_height="100vh",
            background="var(--gray-2)",
        ),
        
        # Audio player (show only on library page)
        rx.cond(
            AppState.current_page == "library",
            audio_player(),
            rx.fragment(),
        ),
        
        # Voice picker overlay
        voice_picker(),
        
        # Modals
        add_text_modal(),
        add_link_modal(),
        settings_modal(),
        create_podcast_modal(),
        
        width="100%",
        min_height="100vh",
        on_mount=AppState.on_load,
    )


# Custom styles
style = {
    "font_family": "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
}


app = rx.App(
    style=style,
    theme=rx.theme(
        accent_color="orange",
        gray_color="slate",
        radius="medium",
        scaling="100%",
    ),
)
app.add_page(index, on_load=AppState.on_load)
