"""Modal components for adding content and settings."""

import reflex as rx
from ..state import AppState


def modal_backdrop(on_close) -> rx.Component:
    """Modal backdrop."""
    return rx.box(
        position="fixed",
        top="0",
        left="0",
        right="0",
        bottom="0",
        background="rgba(0, 0, 0, 0.5)",
        z_index="299",
        on_click=on_close,
    )


def modal_container(*children, width: str = "400px") -> rx.Component:
    """Modal container."""
    return rx.box(
        rx.vstack(
            *children,
            spacing="4",
            width="100%",
        ),
        position="fixed",
        top="50%",
        left="50%",
        transform="translate(-50%, -50%)",
        width=width,
        background="var(--gray-1)",
        border="1px solid var(--gray-4)",
        border_radius="16px",
        padding="24px",
        box_shadow="0 24px 64px rgba(0, 0, 0, 0.3)",
        z_index="300",
    )


def add_text_modal() -> rx.Component:
    """Modal for adding text content."""
    return rx.cond(
        AppState.show_add_text_modal,
        rx.fragment(
            modal_backdrop(AppState.toggle_add_text_modal),
            modal_container(
                # Header
                rx.hstack(
                    rx.hstack(
                        rx.center(
                            rx.icon("type", size=20, color="var(--accent-9)"),
                            width="40px",
                            height="40px",
                            background="var(--accent-3)",
                            border_radius="10px",
                        ),
                        rx.heading("Add Text", size="5"),
                        spacing="3",
                        align="center",
                    ),
                    rx.spacer(),
                    rx.icon_button(
                        rx.icon("x", size=18),
                        size="2",
                        variant="ghost",
                        on_click=AppState.toggle_add_text_modal,
                    ),
                    width="100%",
                    align="center",
                ),
                
                # Title input
                rx.vstack(
                    rx.text("Title (optional)", size="2", weight="medium"),
                    rx.input(
                        placeholder="Enter a title...",
                        value=AppState.new_text_title,
                        on_change=AppState.set_new_text_title,
                        width="100%",
                        size="3",
                    ),
                    spacing="2",
                    width="100%",
                    align="start",
                ),
                
                # Content textarea
                rx.vstack(
                    rx.text("Content", size="2", weight="medium"),
                    rx.text_area(
                        placeholder="Paste or type your text here...",
                        value=AppState.new_text_content,
                        on_change=AppState.set_new_text_content,
                        width="100%",
                        height="200px",
                        size="3",
                    ),
                    spacing="2",
                    width="100%",
                    align="start",
                ),
                
                # Actions
                rx.hstack(
                    rx.button(
                        "Cancel",
                        variant="soft",
                        color_scheme="gray",
                        on_click=AppState.toggle_add_text_modal,
                    ),
                    rx.button(
                        "Add to Library",
                        variant="solid",
                        color_scheme="orange",
                        on_click=AppState.add_text_item,
                    ),
                    spacing="3",
                    justify="end",
                    width="100%",
                ),
                
                width="500px",
            ),
        ),
        rx.fragment(),
    )


def add_link_modal() -> rx.Component:
    """Modal for adding content from a URL."""
    return rx.cond(
        AppState.show_add_link_modal,
        rx.fragment(
            modal_backdrop(AppState.toggle_add_link_modal),
            modal_container(
                # Header
                rx.hstack(
                    rx.hstack(
                        rx.center(
                            rx.icon("link", size=20, color="var(--accent-9)"),
                            width="40px",
                            height="40px",
                            background="var(--accent-3)",
                            border_radius="10px",
                        ),
                        rx.heading("Add Link", size="5"),
                        spacing="3",
                        align="center",
                    ),
                    rx.spacer(),
                    rx.icon_button(
                        rx.icon("x", size=18),
                        size="2",
                        variant="ghost",
                        on_click=AppState.toggle_add_link_modal,
                    ),
                    width="100%",
                    align="center",
                ),
                
                # URL input
                rx.vstack(
                    rx.text("URL", size="2", weight="medium"),
                    rx.input(
                        placeholder="https://example.com/article",
                        value=AppState.new_link_url,
                        on_change=AppState.set_new_link_url,
                        width="100%",
                        size="3",
                    ),
                    rx.text(
                        "We'll extract the text content from this page",
                        size="1",
                        color="var(--gray-9)",
                    ),
                    spacing="2",
                    width="100%",
                    align="start",
                ),
                
                # Actions
                rx.hstack(
                    rx.button(
                        "Cancel",
                        variant="soft",
                        color_scheme="gray",
                        on_click=AppState.toggle_add_link_modal,
                    ),
                    rx.button(
                        "Add to Library",
                        variant="solid",
                        color_scheme="orange",
                        on_click=AppState.add_link_item,
                    ),
                    spacing="3",
                    justify="end",
                    width="100%",
                ),
            ),
        ),
        rx.fragment(),
    )


def settings_modal() -> rx.Component:
    """Settings modal."""
    return rx.cond(
        AppState.show_settings_modal,
        rx.fragment(
            modal_backdrop(AppState.toggle_settings_modal),
            modal_container(
                # Header
                rx.hstack(
                    rx.hstack(
                        rx.center(
                            rx.icon("settings", size=20, color="var(--accent-9)"),
                            width="40px",
                            height="40px",
                            background="var(--accent-3)",
                            border_radius="10px",
                        ),
                        rx.heading("Settings", size="5"),
                        spacing="3",
                        align="center",
                    ),
                    rx.spacer(),
                    rx.icon_button(
                        rx.icon("x", size=18),
                        size="2",
                        variant="ghost",
                        on_click=AppState.toggle_settings_modal,
                    ),
                    width="100%",
                    align="center",
                ),
                
                # Server URL
                rx.vstack(
                    rx.text("VibeVoice Server URL", size="2", weight="medium"),
                    rx.input(
                        placeholder="http://localhost:3000",
                        value=AppState.settings_server_url,
                        on_change=AppState.set_settings_server_url,
                        width="100%",
                        size="3",
                    ),
                    rx.text(
                        "Enter your VibeVoice server URL (from Colab/ngrok)",
                        size="1",
                        color="var(--gray-9)",
                    ),
                    spacing="2",
                    width="100%",
                    align="start",
                ),
                
                # Gemini API Key
                rx.vstack(
                    rx.text("Gemini API Key (for Podcasts)", size="2", weight="medium"),
                    rx.input(
                        placeholder="AIza...",
                        value=AppState.gemini_api_key,
                        on_change=AppState.set_gemini_api_key,
                        type="password",
                        width="100%",
                        size="3",
                    ),
                    rx.text(
                        "Get your free API key from Google AI Studio",
                        size="1",
                        color="var(--gray-9)",
                    ),
                    spacing="2",
                    width="100%",
                    align="start",
                ),
                

                # Connection status
                rx.hstack(
                    rx.text("Status:", size="2", weight="medium"),
                    rx.hstack(
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
                        rx.text(
                            AppState.connection_status,
                            size="2",
                            color=rx.cond(
                                AppState.is_connected,
                                "#22c55e",
                                "#ef4444"
                            ),
                        ),
                        spacing="2",
                        align="center",
                    ),
                    spacing="2",
                    align="center",
                ),
                
                # Actions
                rx.hstack(
                    rx.button(
                        "Cancel",
                        variant="soft",
                        color_scheme="gray",
                        on_click=AppState.toggle_settings_modal,
                    ),
                    rx.button(
                        "Save & Connect",
                        variant="solid",
                        color_scheme="orange",
                        on_click=AppState.save_settings,
                    ),
                    spacing="3",
                    justify="end",
                    width="100%",
                ),
            ),
        ),
        rx.fragment(),
    )
