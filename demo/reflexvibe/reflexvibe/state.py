"""State management for VibeVoice web app."""

import reflex as rx
from typing import List, Optional, Dict
import uuid
from datetime import datetime
import os


class LibraryItem(rx.Base):
    """Represents a document in the library."""
    id: str
    title: str
    content: str
    source_type: str  # file, text, link, podcast
    thumbnail: str = ""
    created_at: str = ""


class PodcastItem(rx.Base):
    """Represents a generated podcast."""
    id: str
    title: str
    style: str  # lecture, debate, interview, late_night
    source_text: str
    script: str
    audio_url: str = ""
    duration: str = ""
    created_at: str = ""
    speakers: List[Dict[str, str]] = []


class AppState(rx.State):
    """Central application state."""
    
    # Library
    items: List[LibraryItem] = []
    
    # Server connection
    server_url: str = "http://localhost:3000"
    is_connected: bool = False
    connection_status: str = "Connecting..."
    
    # Gemini API
    gemini_api_key: str = ""
    
    # Voices - default voices from VibeVoice-Realtime-0.5B
    voices: List[str] = [
        "en-Carter_man",
        "en-Emma_woman", 
        "en-David_man",
        "en-Sarah_woman",
        "en-Michael_man",
        "en-Emily_woman"
    ]
    current_voice: str = ""
    default_voice: str = ""
    
    # Playback
    is_playing: bool = False
    current_item_id: str = ""
    playback_speed: float = 1.0
    current_text: str = "Select an item to start reading"
    playback_status: str = ""
    
    # UI State
    view_mode: str = "grid"
    show_voice_picker: bool = False
    show_add_text_modal: bool = False
    show_add_link_modal: bool = False
    show_settings_modal: bool = False
    
    # Form inputs
    new_text_title: str = ""
    new_text_content: str = ""
    new_link_url: str = ""
    settings_server_url: str = ""
    gemini_api_key: str = ""
    
    # Sidebar
    current_page: str = "library"
    
    # Audio playback - passed to JavaScript
    _audio_text_to_play: str = ""
    _audio_server_url: str = ""
    _audio_voice: str = ""
    
    # ======== PODCAST STATE ========
    podcasts: List[PodcastItem] = []
    show_create_podcast_modal: bool = False
    podcast_creation_step: int = 1
    podcast_style: str = "lecture"
    podcast_source_text: str = ""
    podcast_speakers: List[Dict[str, str]] = []
    podcast_generating: bool = False
    podcast_progress: str = ""
    current_podcast_id: str = ""
    generated_script: str = ""
    speaker_1_voice: str = ""
    speaker_2_voice: str = ""
    
    @rx.var
    def audio_text_to_play(self) -> str:
        return self._audio_text_to_play
    
    @rx.var
    def audio_server_url(self) -> str:
        return self._audio_server_url
    
    @rx.var
    def audio_voice(self) -> str:
        return self._audio_voice
    
    # ======== VIEW METHODS ========
    
    @rx.event
    def toggle_view_mode(self):
        """Toggle between grid and list view."""
        self.view_mode = "list" if self.view_mode == "grid" else "grid"
    
    @rx.event
    def set_page(self, page: str):
        """Navigate to a page."""
        self.current_page = page
    
    @rx.event
    def toggle_voice_picker(self):
        """Toggle voice picker visibility."""
        self.show_voice_picker = not self.show_voice_picker
    
    @rx.event
    def toggle_add_text_modal(self):
        """Toggle add text modal."""
        self.show_add_text_modal = not self.show_add_text_modal
        if not self.show_add_text_modal:
            self.new_text_title = ""
            self.new_text_content = ""
    
    @rx.event
    def toggle_add_link_modal(self):
        """Toggle add link modal."""
        self.show_add_link_modal = not self.show_add_link_modal
        if not self.show_add_link_modal:
            self.new_link_url = ""
    
    @rx.event
    def toggle_settings_modal(self):
        """Toggle settings modal."""
        self.show_settings_modal = not self.show_settings_modal
        if self.show_settings_modal:
            self.settings_server_url = self.server_url
    
    @rx.event
    def set_gemini_api_key(self, value: str):
        """Set Gemini API key."""
        self.gemini_api_key = value
    
    # ======== FORM METHODS ========
    
    @rx.event
    def set_new_text_title(self, value: str):
        self.new_text_title = value
    
    @rx.event
    def set_new_text_content(self, value: str):
        self.new_text_content = value
    
    @rx.event
    def set_new_link_url(self, value: str):
        self.new_link_url = value
    
    @rx.event
    def set_settings_server_url(self, value: str):
        self.settings_server_url = value
    
    @rx.event
    def set_gemini_api_key(self, value: str):
        self.gemini_api_key = value
    
    # ======== LIBRARY METHODS ========
    
    @rx.event
    def add_text_item(self):
        """Add a new text item to the library."""
        if not self.new_text_content.strip():
            return
        
        title = self.new_text_title.strip() or f"Text - {datetime.now().strftime('%b %d, %Y')}"
        
        new_item = LibraryItem(
            id=str(uuid.uuid4()),
            title=title,
            content=self.new_text_content.strip(),
            source_type="text",
            thumbnail="",
            created_at=datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        )
        
        self.items = [new_item] + self.items
        self.toggle_add_text_modal()
    
    @rx.event
    def add_link_item(self):
        """Add a new link item to the library."""
        if not self.new_link_url.strip():
            return
        
        url = self.new_link_url.strip()
        title = url.replace("https://", "").replace("http://", "").split("/")[0]
        
        new_item = LibraryItem(
            id=str(uuid.uuid4()),
            title=title,
            content=f"Content from: {url}",
            source_type="web",
            thumbnail="",
            created_at=datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        )
        
        self.items = [new_item] + self.items
        self.toggle_add_link_modal()
    
    @rx.event
    def save_settings(self):
        """Save settings and reconnect."""
        self.server_url = self.settings_server_url.strip()
        self.toggle_settings_modal()
        return AppState.check_connection
    
    @rx.event
    def select_item(self, item_id: str):
        """Select an item for playback."""
        self.current_item_id = item_id
        for item in self.items:
            if item.id == item_id:
                self.current_text = item.content[:100] + "..." if len(item.content) > 100 else item.content
                break
    
    @rx.event
    def delete_item(self, item_id: str):
        """Delete an item from the library."""
        self.items = [item for item in self.items if item.id != item_id]
        if self.current_item_id == item_id:
            self.current_item_id = ""
            self.current_text = "Select an item to start reading"
    
    # ======== VOICE METHODS ========
    
    @rx.event
    def select_voice(self, voice: str):
        """Select a voice for TTS."""
        self.current_voice = voice
        self.show_voice_picker = False
    
    @rx.event
    def set_playback_speed(self, speed: float):
        """Set playback speed."""
        self.playback_speed = speed
    
    # ======== PLAYBACK METHODS ========
    
    @rx.event
    def toggle_playback(self):
        """Toggle play/pause - triggers JavaScript audio player."""
        if not self.current_item_id:
            self.playback_status = "Select an item first"
            return
        
        if not self.is_connected:
            self.playback_status = "Not connected to server"
            return
        
        self.is_playing = not self.is_playing
        
        if self.is_playing:
            content = ""
            for item in self.items:
                if item.id == self.current_item_id:
                    content = item.content
                    break
            
            if content:
                self._audio_text_to_play = content
                self._audio_server_url = self.server_url
                self._audio_voice = self.current_voice
                self.playback_status = "Starting playback..."
            else:
                self.is_playing = False
                self.playback_status = "No content to play"
        else:
            self._audio_text_to_play = ""
            self.playback_status = "Stopped"
    
    @rx.event
    def stop_playback(self):
        """Stop audio playback."""
        self.is_playing = False
        self._audio_text_to_play = ""
        self.playback_status = ""
    
    @rx.event
    def playback_ended(self):
        """Called when audio playback ends."""
        self.is_playing = False
        self._audio_text_to_play = ""
        self.playback_status = "Finished"
    
    # ======== PODCAST METHODS ========
    
    @rx.event
    def toggle_create_podcast_modal(self):
        """Toggle create podcast modal."""
        self.show_create_podcast_modal = not self.show_create_podcast_modal
        if not self.show_create_podcast_modal:
            # Reset state
            self.podcast_creation_step = 1
            self.podcast_source_text = ""
            self.generated_script = ""
            self.podcast_generating = False
    
    @rx.event
    def set_podcast_style(self, style: str):
        """Set podcast style."""
        self.podcast_style = style
    
    @rx.event
    def set_podcast_source_text(self, text: str):
        """Set podcast source text."""
        self.podcast_source_text = text
    
    @rx.event
    def set_speaker_voice(self, speaker_num: int, voice: str):
        """Set voice for a speaker."""
        if speaker_num == 1:
            self.speaker_1_voice = voice
        else:
            self.speaker_2_voice = voice
    
    @rx.event
    def next_podcast_step(self):
        """Go to next step in podcast creation."""
        if self.podcast_creation_step < 4:
            self.podcast_creation_step += 1
    
    @rx.event
    def prev_podcast_step(self):
        """Go to previous step in podcast creation."""
        if self.podcast_creation_step > 1:
            self.podcast_creation_step -= 1
    @rx.event
    def handle_podcast_generate(self):
        """Handle generate button click - either generate script or audio."""
        import requests
        
        print("=" * 50)
        print("handle_podcast_generate called!")
        print(f"generated_script is empty: {self.generated_script == ''}")
        print(f"gemini_api_key: {'SET' if self.gemini_api_key else 'NOT SET'}")
        print(f"source_text length: {len(self.podcast_source_text)}")
        print("=" * 50)
        
        if self.generated_script == "":
            # Generate script with Gemini
            self.podcast_generating = True
            self.podcast_progress = "Generating script with AI..."
            
            api_key = self.gemini_api_key or os.environ.get("GEMINI_API_KEY", "")
            
            if not api_key:
                print("ERROR: No API key!")
                self.podcast_progress = "Error: Please set your Gemini API key in Settings"
                self.podcast_generating = False
                return
            
            prompt = f"""You are a podcast script writer. Convert the following content into an educational lecture-style dialogue between a Teacher (Speaker 1) and a Student (Speaker 2).

The Teacher should explain the concepts clearly and engagingly.
The Student should ask clarifying questions and show understanding.

Rules:
- Use exactly this format: "Speaker 1: [text]" or "Speaker 2: [text]"
- Keep each speaker's turn to 1-3 sentences
- Make it sound natural and conversational
- Total length: 8-12 exchanges

Content to convert:
{self.podcast_source_text}

Generate the podcast script:"""

            try:
                print("Making API request...")
                response = requests.post(
                    f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={api_key}",
                    json={
                        "contents": [{"parts": [{"text": prompt}]}],
                        "generationConfig": {
                            "temperature": 0.7,
                            "maxOutputTokens": 2048,
                        }
                    },
                    headers={"Content-Type": "application/json"},
                    timeout=60
                )
                print(f"API response status: {response.status_code}")
                
                if response.status_code == 200:
                    data = response.json()
                    candidates = data.get("candidates", [])
                    print(f"Candidates: {len(candidates)}")
                    if candidates:
                        content = candidates[0].get("content", {})
                        parts = content.get("parts", [])
                        if parts:
                            self.generated_script = parts[0].get("text", "")
                            self.podcast_progress = "Script generated! Click 'Create Podcast' to save."
                            print("SUCCESS: Script generated!")
                            print(f"Script preview: {self.generated_script[:100]}...")
                        else:
                            self.podcast_progress = "Error: Empty response from AI"
                            print("ERROR: Empty parts in response")
                    else:
                        self.podcast_progress = "Error: No response from AI"
                        print("ERROR: No candidates in response")
                else:
                    error_text = response.text[:500] if response.text else "Unknown error"
                    self.podcast_progress = f"Error: API returned {response.status_code}"
                    print(f"API ERROR: {response.status_code}")
                    print(f"Response: {error_text}")
            except Exception as e:
                self.podcast_progress = f"Error: {str(e)}"
                print(f"EXCEPTION: {str(e)}")
            
            self.podcast_generating = False
            print("Done processing.")
        else:
            # Generate audio / save podcast
            self.podcast_generating = True
            self.podcast_progress = "Creating podcast..."
            
            new_podcast = PodcastItem(
                id=str(uuid.uuid4()),
                title=f"Lecture - {datetime.now().strftime('%b %d')}",
                style=self.podcast_style,
                source_text=self.podcast_source_text,
                script=self.generated_script,
                audio_url="",
                duration="~5 min",
                created_at=datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                speakers=[
                    {"id": "1", "name": "Teacher", "voice": self.speaker_1_voice},
                    {"id": "2", "name": "Student", "voice": self.speaker_2_voice},
                ]
            )
            
            self.podcasts = [new_podcast] + self.podcasts
            self.podcast_progress = "Podcast created!"
            self.podcast_generating = False
            self.show_create_podcast_modal = False
            self.podcast_creation_step = 1
            self.generated_script = ""
            self.podcast_source_text = ""
    
    @rx.event
    async def generate_podcast_script(self):
        """Generate podcast script using Gemini API."""
        import httpx
        
        self.podcast_generating = True
        self.podcast_progress = "Generating script with AI..."
        
        # Get API key from environment or state
        api_key = self.gemini_api_key or os.environ.get("GEMINI_API_KEY", "")
        
        if not api_key:
            self.podcast_progress = "Error: Please set your Gemini API key in Settings"
            self.podcast_generating = False
            return
        
        # Lecture-style prompt
        prompt = f"""You are a podcast script writer. Convert the following content into an educational lecture-style dialogue between a Teacher (Speaker 1) and a Student (Speaker 2).

The Teacher should explain the concepts clearly and engagingly.
The Student should ask clarifying questions and show understanding.

Rules:
- Use exactly this format: "Speaker 1: [text]" or "Speaker 2: [text]"
- Keep each speaker's turn to 1-3 sentences
- Make it sound natural and conversational
- Total length: 8-12 exchanges

Content to convert:
{self.podcast_source_text}

Generate the podcast script:"""

        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                response = await client.post(
                    f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={api_key}",
                    json={
                        "contents": [{"parts": [{"text": prompt}]}],
                        "generationConfig": {
                            "temperature": 0.7,
                            "maxOutputTokens": 2048,
                        }
                    },
                    headers={"Content-Type": "application/json"},
                )
                
                if response.status_code == 200:
                    data = response.json()
                    # Extract text from Gemini response
                    candidates = data.get("candidates", [])
                    if candidates:
                        content = candidates[0].get("content", {})
                        parts = content.get("parts", [])
                        if parts:
                            self.generated_script = parts[0].get("text", "")
                            self.podcast_progress = "Script generated successfully!"
                        else:
                            self.podcast_progress = "Error: Empty response from AI"
                    else:
                        self.podcast_progress = "Error: No response from AI"
                else:
                    self.podcast_progress = f"Error: API returned {response.status_code}"
        except Exception as e:
            self.podcast_progress = f"Error: {str(e)}"
        
        self.podcast_generating = False
    
    @rx.event
    async def generate_podcast_audio(self):
        """Generate podcast audio using VibeVoice-1.5B."""
        self.podcast_generating = True
        self.podcast_progress = "Sending to VibeVoice server..."
        
        # TODO: Implement audio generation via Colab/server
        # For now, save the podcast with script only
        
        new_podcast = PodcastItem(
            id=str(uuid.uuid4()),
            title=f"Lecture - {datetime.now().strftime('%b %d')}",
            style=self.podcast_style,
            source_text=self.podcast_source_text,
            script=self.generated_script,
            audio_url="",  # Will be set when audio is generated
            duration="~5 min",
            created_at=datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            speakers=[
                {"id": "1", "name": "Teacher", "voice": self.speaker_1_voice},
                {"id": "2", "name": "Student", "voice": self.speaker_2_voice},
            ]
        )
        
        self.podcasts = [new_podcast] + self.podcasts
        self.podcast_progress = "Podcast created! (Audio generation requires Colab server)"
        self.podcast_generating = False
        
        # Close modal after brief delay
        self.show_create_podcast_modal = False
        self.podcast_creation_step = 1
        self.podcast_source_text = ""
        self.generated_script = ""
    
    @rx.event
    def select_podcast(self, podcast_id: str):
        """Select a podcast."""
        self.current_podcast_id = podcast_id
    
    @rx.event
    def play_podcast(self, podcast_id: str):
        """Play a podcast."""
        self.current_podcast_id = podcast_id
        # TODO: Implement audio playback
    
    @rx.event
    def delete_podcast(self, podcast_id: str):
        """Delete a podcast."""
        self.podcasts = [p for p in self.podcasts if p.id != podcast_id]
        if self.current_podcast_id == podcast_id:
            self.current_podcast_id = ""
    
    # ======== CONNECTION METHODS ========
    
    @rx.event
    async def check_connection(self):
        """Check connection to the TTS server."""
        import httpx
        
        self.connection_status = "Connecting..."
        self.is_connected = False
        
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                response = await client.get(f"{self.server_url}/config")
                if response.status_code == 200:
                    data = response.json()
                    self.voices = data.get("voices", [])
                    self.default_voice = data.get("default_voice", "")
                    if not self.current_voice and self.default_voice:
                        self.current_voice = self.default_voice
                    self.is_connected = True
                    self.connection_status = "Connected"
                else:
                    self.connection_status = "Server error"
        except Exception as e:
            self.connection_status = "Offline"
            self.is_connected = False
    
    @rx.event
    def on_load(self):
        """Called when the app loads."""
        if not self.items:
            sample_items = [
                LibraryItem(
                    id=str(uuid.uuid4()),
                    title="Welcome to VibeVoice",
                    content="Welcome to VibeVoice, your premium text-to-speech application. Add documents, articles, or any text and listen to them with natural-sounding AI voices. Get started by clicking the '+' button to add your first item.",
                    source_type="text",
                    thumbnail="",
                    created_at=datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                ),
            ]
            self.items = sample_items
        
        return AppState.check_connection
