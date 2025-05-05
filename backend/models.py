from tortoise import fields, models

class Playlist(models.Model):
    id = fields.IntField(pk=True)
    name = fields.CharField(max_length=255, unique=True)
    songs = fields.JSONField()

    class Meta:
        table = "playlists"

class UserActivity(models.Model):
    id = fields.IntField(pk=True)
    song_name = fields.CharField(max_length=255)
    play_count = fields.IntField(default=1)
    last_played = fields.DatetimeField(auto_now=True)
    
    class Meta:
        table = "user_activity"