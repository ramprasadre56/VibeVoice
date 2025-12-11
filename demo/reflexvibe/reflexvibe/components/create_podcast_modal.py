"""Create podcast modal component."""

import reflex as rx
from ..state import AppState


def step_indicator(step: int, current_step: int, label: str) -> rx.Component:
    """Step indicator in the wizard."""
    is_active = current_step >= step
    is_current = current_step == step
    
    return rx.hstack(
        rx.center(
            rx.text(str(step), size="2", weight="bold"),
            width="32px",
            height="32px",
            border_radius="50%",
            background=rx.cond(
                is_active,
                "var(--accent-9)",
                "var(--gray-4)"
            ),
            color=rx.cond(is_active, "white", "var(--gray-9)"),
        ),
        rx.text(
            label,
            size="2",
            weight=rx.cond(is_current, "bold", "regular"),
            color=rx.cond(is_active, "var(--gray-12)", "var(--gray-9)"),
        ),
        spacing="2",
        align="center",
    )


def step_1_style() -> rx.Component:
    """Step 1: Choose podcast style."""
    return rx.vstack(
        rx.heading("Choose a Style", size="4"),
        rx.text(
            "Select the format for your podcast",
            size="2",
            color="var(--gray-9)",
        ),
        
        rx.box(
            rx.vstack(
                # Lecture style card
                rx.box(
                    rx.hstack(
                        rx.center(
                            rx.icon("graduation-cap", size=28, color="white"),
                            width="56px",
                            height="56px",
                            background="linear-gradient(135deg, #6366f1, #8b5cf6)",
                            border_radius="12px",
                        ),
                        rx.vstack(
                            rx.text("Lecture", size="3", weight="bold"),
                            rx.text(
                                "Educational explanation with a teacher guiding a student through the topic",
                                size="2",
                                color="var(--gray-9)",
                            ),
                            spacing="1",
                            align="start",
                        ),
                        rx.spacer(),
                        rx.cond(
                            AppState.podcast_style == "lecture",
                            rx.icon("check-circle", size=24, color="var(--accent-9)"),
                            rx.fragment(),
                        ),
                        spacing="4",
                        align="center",
                        width="100%",
                    ),
                    padding="16px",
                    background=rx.cond(
                        AppState.podcast_style == "lecture",
                        "var(--accent-3)",
                        "var(--gray-2)"
                    ),
                    border=rx.cond(
                        AppState.podcast_style == "lecture",
                        "2px solid var(--accent-9)",
                        "1px solid var(--gray-4)"
                    ),
                    border_radius="12px",
                    cursor="pointer",
                    on_click=lambda: AppState.set_podcast_style("lecture"),
                ),
                
                # Coming soon styles
                rx.box(
                    rx.hstack(
                        rx.center(
                            rx.icon("users", size=28, color="var(--gray-7)"),
                            width="56px",
                            height="56px",
                            background="var(--gray-4)",
                            border_radius="12px",
                        ),
                        rx.vstack(
                            rx.hstack(
                                rx.text("Debate", size="3", weight="bold", color="var(--gray-9)"),
                                rx.badge("Coming Soon", color_scheme="gray", size="1"),
                                spacing="2",
                            ),
                            rx.text(
                                "Two opposing viewpoints discussing the topic",
                                size="2",
                                color="var(--gray-8)",
                            ),
                            spacing="1",
                            align="start",
                        ),
                        spacing="4",
                        align="center",
                        width="100%",
                    ),
                    padding="16px",
                    background="var(--gray-2)",
                    border="1px solid var(--gray-4)",
                    border_radius="12px",
                    opacity="0.6",
                    cursor="not-allowed",
                ),
                
                spacing="3",
                width="100%",
            ),
            margin_top="16px",
        ),
        
        spacing="3",
        width="100%",
    )


def step_2_content() -> rx.Component:
    """Step 2: Input content."""
    return rx.vstack(
        rx.heading("Add Your Content", size="4"),
        rx.text(
            "Paste the text you want to convert into a podcast",
            size="2",
            color="var(--gray-9)",
        ),
        
        rx.text_area(
            placeholder="Paste your article, notes, or any text content here...\n\nExample: 'VibeVoice is a novel framework designed for generating expressive, long-form speech...'",
            value=AppState.podcast_source_text,
            on_change=AppState.set_podcast_source_text,
            min_height="200px",
            width="100%",
            resize="vertical",
        ),
        
        rx.hstack(
            rx.text(
                f"Characters: ",
                size="1",
                color="var(--gray-9)",
            ),
            rx.text(
                AppState.podcast_source_text.length(),
                size="1",
                color="var(--gray-9)",
            ),
            spacing="1",
        ),
        
        spacing="3",
        width="100%",
    )


def speaker_config_card(speaker_num: int, name: str, color: str) -> rx.Component:
    """Speaker configuration card."""
    return rx.box(
        rx.hstack(
            rx.center(
                rx.text(str(speaker_num), weight="bold", color="white"),
                width="36px",
                height="36px",
                border_radius="50%",
                background=color,
            ),
            rx.vstack(
                rx.text(f"Speaker {speaker_num}", size="2", weight="medium"),
                rx.text(name, size="1", color="var(--gray-9)"),
                spacing="0",
                align="start",
            ),
            rx.spacer(),
            rx.select(
                AppState.voices,
                placeholder="Select voice",
                size="2",
                on_change=lambda v: AppState.set_speaker_voice(speaker_num, v),
            ),
            spacing="3",
            align="center",
            width="100%",
        ),
        padding="12px",
        background="var(--gray-2)",
        border="1px solid var(--gray-4)",
        border_radius="10px",
    )


def step_3_speakers() -> rx.Component:
    """Step 3: Configure speakers."""
    return rx.vstack(
        rx.heading("Configure Speakers", size="4"),
        rx.text(
            "Set up the voices for your lecture",
            size="2",
            color="var(--gray-9)",
        ),
        
        rx.vstack(
            speaker_config_card(1, "Teacher / Instructor", "#6366f1"),
            speaker_config_card(2, "Student / Learner", "#8b5cf6"),
            spacing="2",
            width="100%",
        ),
        
        rx.callout(
            "The AI will generate a dialogue between a teacher explaining the topic and a student asking questions.",
            icon="info",
            color_scheme="blue",
            size="1",
        ),
        
        spacing="4",
        width="100%",
    )


def step_4_generate() -> rx.Component:
    """Step 4: Review and generate."""
    return rx.vstack(
        rx.heading("Generate Podcast", size="4"),
        rx.text(
            "Review your settings and generate the podcast",
            size="2",
            color="var(--gray-9)",
        ),
        
        # Summary
        rx.box(
            rx.vstack(
                rx.hstack(
                    rx.text("Style:", size="2", color="var(--gray-9)", width="80px"),
                    rx.badge("Lecture", color_scheme="violet"),
                    align="center",
                ),
                rx.hstack(
                    rx.text("Content:", size="2", color="var(--gray-9)", width="80px"),
                    rx.text(
                        rx.cond(
                            AppState.podcast_source_text.length() > 50,
                            AppState.podcast_source_text[:50] + "...",
                            AppState.podcast_source_text
                        ),
                        size="2",
                    ),
                    align="center",
                ),
                rx.hstack(
                    rx.text("Speakers:", size="2", color="var(--gray-9)", width="80px"),
                    rx.text("2 (Teacher + Student)", size="2"),
                    align="center",
                ),
                spacing="2",
                width="100%",
            ),
            padding="16px",
            background="var(--gray-2)",
            border="1px solid var(--gray-4)",
            border_radius="10px",
        ),
        
        # Generated script preview (if available)
        rx.cond(
            AppState.generated_script != "",
            rx.box(
                rx.vstack(
                    rx.hstack(
                        rx.text("Generated Script", size="2", weight="bold"),
                        rx.spacer(),
                        rx.badge("Preview", color_scheme="green", size="1"),
                    ),
                    rx.scroll_area(
                        rx.text(
                            AppState.generated_script,
                            size="2",
                            style={"white-space": "pre-wrap"},
                        ),
                        type="hover",
                        scrollbars="vertical",
                        style={"height": "150px"},
                    ),
                    spacing="2",
                    width="100%",
                ),
                padding="16px",
                background="var(--green-2)",
                border="1px solid var(--green-6)",
                border_radius="10px",
            ),
            rx.fragment(),
        ),
        
        # Progress indicator
        rx.cond(
            AppState.podcast_generating,
            rx.box(
                rx.vstack(
                    rx.spinner(size="3"),
                    rx.text(
                        AppState.podcast_progress,
                        size="2",
                        color="var(--gray-9)",
                    ),
                    spacing="2",
                    align="center",
                ),
                padding="24px",
            ),
            rx.fragment(),
        ),
        
        spacing="4",
        width="100%",
    )


def create_podcast_modal() -> rx.Component:
    """Multi-step modal for creating a podcast."""
    return rx.cond(
        AppState.show_create_podcast_modal,
        rx.box(
            # Backdrop
            rx.box(
                position="fixed",
                top="0",
                left="0",
                right="0",
                bottom="0",
                background="rgba(0, 0, 0, 0.6)",
                z_index="299",
                on_click=AppState.toggle_create_podcast_modal,
            ),
            
            # Modal
            rx.box(
                rx.vstack(
                    # Header
                    rx.hstack(
                        rx.heading("Create a Podcast", size="5"),
                        rx.spacer(),
                        rx.icon_button(
                            rx.icon("x", size=20),
                            variant="ghost",
                            on_click=AppState.toggle_create_podcast_modal,
                        ),
                        width="100%",
                        align="center",
                    ),
                    
                    # Step indicators
                    rx.hstack(
                        step_indicator(1, AppState.podcast_creation_step, "Style"),
                        rx.box(width="40px", height="1px", background="var(--gray-6)"),
                        step_indicator(2, AppState.podcast_creation_step, "Content"),
                        rx.box(width="40px", height="1px", background="var(--gray-6)"),
                        step_indicator(3, AppState.podcast_creation_step, "Speakers"),
                        rx.box(width="40px", height="1px", background="var(--gray-6)"),
                        step_indicator(4, AppState.podcast_creation_step, "Generate"),
                        justify="center",
                        align="center",
                        width="100%",
                        padding="16px 0",
                    ),
                    
                    rx.divider(size="4"),
                    
                    # Content based on step
                    rx.box(
                        rx.match(
                            AppState.podcast_creation_step,
                            (1, step_1_style()),
                            (2, step_2_content()),
                            (3, step_3_speakers()),
                            (4, step_4_generate()),
                            step_1_style(),  # default
                        ),
                        min_height="300px",
                        width="100%",
                        padding="16px 0",
                    ),
                    
                    rx.divider(size="4"),
                    
                    # Footer buttons
                    rx.hstack(
                        rx.cond(
                            AppState.podcast_creation_step > 1,
                            rx.button(
                                "Back",
                                variant="soft",
                                color_scheme="gray",
                                on_click=AppState.prev_podcast_step,
                            ),
                            rx.fragment(),
                        ),
                        rx.spacer(),
                        rx.cond(
                            AppState.podcast_creation_step < 4,
                            rx.button(
                                "Continue",
                                variant="solid",
                                color_scheme="violet",
                                on_click=AppState.next_podcast_step,
                                disabled=rx.cond(
                                    (AppState.podcast_creation_step == 2) & (AppState.podcast_source_text.length() < 50),
                                    True,
                                    False
                                ),
                            ),
                            rx.button(
                                rx.cond(
                                    AppState.generated_script == "",
                                    rx.hstack(
                                        rx.icon("sparkles", size=16),
                                        rx.text("Generate Script"),
                                        spacing="2",
                                    ),
                                    rx.hstack(
                                        rx.icon("headphones", size=16),
                                        rx.text("Create Podcast"),
                                        spacing="2",
                                    ),
                                ),
                                variant="solid",
                                color_scheme="violet",
                                on_click=AppState.handle_podcast_generate,
                                disabled=AppState.podcast_generating,
                            ),
                        ),
                        width="100%",
                    ),
                    
                    spacing="3",
                    width="100%",
                ),
                position="fixed",
                top="50%",
                left="50%",
                transform="translate(-50%, -50%)",
                width="600px",
                max_height="90vh",
                background="var(--gray-1)",
                border="1px solid var(--gray-4)",
                border_radius="16px",
                padding="24px",
                box_shadow="0 24px 64px rgba(0, 0, 0, 0.3)",
                z_index="300",
                overflow="auto",
            ),
        ),
        rx.fragment(),
    )
