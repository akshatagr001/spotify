from tortoise import fields, models

class Playlist(models.Model):
    id = fields.IntField(pk=True)
    name = fields.CharField(max_length=255, unique=True)
    songs = fields.JSONField()

    class Meta:
        table = "playlists"