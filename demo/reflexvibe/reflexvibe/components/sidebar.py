"""Sidebar navigation component."""

import reflex as rx
from ..state import AppState


def nav_item(icon: str, label: str, page: str) -> rx.Component:
    """Navigation item in the sidebar."""
    is_active = AppState.current_page == page
    
    return rx.box(
        rx.hstack(
            rx.icon(icon, size=20),
            rx.text(label, weight="medium"),
            spacing="3",
            align="center",
            width="100%",
        ),
        padding="12px 16px",
        border_radius="10px",
        cursor="pointer",
        background=rx.cond(is_active, "var(--accent-3)", "transparent"),
        color=rx.cond(is_active, "var(--accent-11)", "var(--gray-11)"),
        _hover={
            "background": "var(--gray-3)",
        },
        on_click=lambda: AppState.set_page(page),
    )


def sidebar() -> rx.Component:
    """Left sidebar with navigation."""
    return rx.box(
        rx.vstack(
            # Brand
            rx.hstack(
                rx.icon("audio-waveform", size=28, color="var(--accent-9)"),
                rx.text(
                    "VibeVoice",
                    size="5",
                    weight="bold",
                    color="var(--accent-11)",
                ),
                spacing="3",
                align="center",
                padding="20px 16px",
            ),
            
            # Navigation
            rx.vstack(
                nav_item("library", "Library", "library"),
                nav_item("podcast", "Podcasts", "podcasts"),
                spacing="1",
                width="100%",
                padding_x="8px",
            ),
            
            # Spacer
            rx.spacer(),
            
            # Settings at bottom
            rx.box(
                rx.hstack(
                    rx.icon("settings", size=18),
                    rx.text("Settings", size="2"),
                    spacing="2",
                    align="center",
                ),
                padding="12px 16px",
                margin="8px",
                border_radius="8px",
                cursor="pointer",
                color="var(--gray-11)",
                _hover={
                    "background": "var(--gray-3)",
                },
                on_click=AppState.toggle_settings_modal,
            ),
            
            spacing="0",
            height="100%",
            width="100%",
        ),
        width="220px",
        height="100vh",
        background="var(--gray-1)",
        border_right="1px solid var(--gray-4)",
        position="fixed",
        left="0",
        top="0",
    )
