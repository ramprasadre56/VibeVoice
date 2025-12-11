"""Podcasts page component."""

import reflex as rx
from ..state import AppState


def podcast_style_card(
    icon: str,
    title: str,
    description: str,
    style_id: str,
    color: str,
) -> rx.Component:
    """Card for selecting podcast style."""
    is_selected = AppState.podcast_style == style_id
    
    return rx.box(
        rx.vstack(
            rx.center(
                rx.icon(icon, size=32, color="white"),
                width="64px",
                height="64px",
                background=f"linear-gradient(135deg, {color}, {color}dd)",
                border_radius="16px",
                box_shadow=f"0 8px 24px {color}40",
            ),
            rx.text(
                title,
                size="3",
                weight="bold",
                color="var(--gray-12)",
            ),
            rx.text(
                description,
                size="1",
                color="var(--gray-9)",
                text_align="center",
            ),
            spacing="3",
            align="center",
        ),
        padding="20px",
        background=rx.cond(is_selected, "var(--accent-3)", "var(--gray-2)"),
        border=rx.cond(
            is_selected,
            "2px solid var(--accent-9)",
            "1px solid var(--gray-4)"
        ),
        border_radius="16px",
        cursor="pointer",
        transition="all 0.2s ease",
        _hover={
            "transform": "translateY(-4px)",
            "box-shadow": "0 12px 32px rgba(0, 0, 0, 0.1)",
        },
        on_click=lambda: AppState.set_podcast_style(style_id),
    )


def create_podcast_landing() -> rx.Component:
    """Landing page when no podcasts created yet."""
    return rx.center(
        rx.vstack(
            # Hero section
            rx.box(
                rx.vstack(
                    # Podcast player illustration
                    rx.center(
                        rx.vstack(
                            rx.hstack(
                                rx.icon("book-open", size=24, color="var(--accent-9)"),
                                rx.text("Lecture", size="3", weight="bold", color="white"),
                                spacing="2",
                                align="center",
                            ),
                            spacing="2",
                            align="center",
                        ),
                        width="120px",
                        height="120px",
                        background="linear-gradient(135deg, #6366f1, #8b5cf6)",
                        border_radius="20px",
                        box_shadow="0 20px 60px rgba(99, 102, 241, 0.4)",
                    ),
                    spacing="4",
                    align="center",
                ),
                padding="40px",
                background="linear-gradient(180deg, var(--gray-3), var(--gray-2))",
                border_radius="24px",
                border="1px solid var(--gray-4)",
                margin_bottom="32px",
            ),
            
            # Title
            rx.heading(
                "Turn Anything into a Podcast!",
                size="7",
                weight="bold",
                color="var(--gray-12)",
            ),
            rx.text(
                "Transform your text, articles, or documents into an AI-powered lecture or educational podcast!",
                size="4",
                color="var(--gray-10)",
                text_align="center",
                max_width="500px",
            ),
            
            # CTA Button
            rx.button(
                "Create a Podcast",
                size="4",
                variant="solid",
                color_scheme="violet",
                on_click=AppState.toggle_create_podcast_modal,
                style={
                    "padding": "12px 32px",
                    "font-size": "16px",
                    "font-weight": "600",
                },
            ),
            
            spacing="5",
            align="center",
            padding="60px",
        ),
        width="100%",
        min_height="calc(100vh - 160px)",
    )


def podcast_item_card(podcast: dict) -> rx.Component:
    """Card for a generated podcast in the library."""
    is_selected = AppState.current_podcast_id == podcast["id"]
    
    return rx.box(
        rx.hstack(
            # Icon
            rx.center(
                rx.icon("headphones", size=24, color="white"),
                width="56px",
                height="56px",
                background="linear-gradient(135deg, #6366f1, #8b5cf6)",
                border_radius="12px",
            ),
            
            # Info
            rx.vstack(
                rx.text(
                    podcast["title"],
                    size="3",
                    weight="medium",
                    color="var(--gray-12)",
                ),
                rx.hstack(
                    rx.badge(podcast["style"], color_scheme="violet", size="1"),
                    rx.text(
                        podcast["created_at"],
                        size="1",
                        color="var(--gray-9)",
                    ),
                    spacing="2",
                ),
                spacing="1",
                align="start",
                flex="1",
            ),
            
            # Duration
            rx.text(
                podcast["duration"],
                size="2",
                color="var(--gray-9)",
            ),
            
            # Play button
            rx.icon_button(
                rx.icon("play", size=18),
                size="2",
                variant="solid",
                color_scheme="violet",
                radius="full",
                on_click=lambda: AppState.play_podcast(podcast["id"]),
            ),
            
            spacing="4",
            align="center",
            width="100%",
        ),
        padding="16px",
        background=rx.cond(is_selected, "var(--accent-2)", "var(--gray-1)"),
        border="1px solid var(--gray-4)",
        border_radius="12px",
        cursor="pointer",
        transition="all 0.15s ease",
        _hover={"background": "var(--gray-3)"},
        on_click=lambda: AppState.select_podcast(podcast["id"]),
    )


def podcast_library() -> rx.Component:
    """Library of generated podcasts."""
    return rx.vstack(
        rx.hstack(
            rx.heading("Your Podcasts", size="5"),
            rx.spacer(),
            rx.button(
                rx.icon("plus", size=16),
                "New Podcast",
                variant="solid",
                color_scheme="violet",
                on_click=AppState.toggle_create_podcast_modal,
            ),
            width="100%",
            align="center",
        ),
        rx.cond(
            AppState.podcasts.length() > 0,
            rx.vstack(
                rx.foreach(AppState.podcasts, podcast_item_card),
                spacing="2",
                width="100%",
            ),
            rx.center(
                rx.text("No podcasts yet. Create your first one!", color="var(--gray-9)"),
                padding="40px",
            ),
        ),
        spacing="4",
        width="100%",
        padding="24px",
    )


def podcasts_page() -> rx.Component:
    """Main podcasts page."""
    return rx.box(
        rx.cond(
            AppState.podcasts.length() > 0,
            podcast_library(),
            create_podcast_landing(),
        ),
        width="100%",
        min_height="100vh",
    )
