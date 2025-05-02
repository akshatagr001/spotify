import os

# Specify the directory containing the files
directory = 'C:/Users/DC/Desktop/AKSHAT/spotify_clone/backend/static/images/'

# Iterate through all files in the directory
for filename in os.listdir(directory):
    if filename.endswith(".jpeg"):
        # Construct full file paths
        old_file = os.path.join(directory, filename)
        new_file = os.path.join(directory, filename.replace(".jpeg", ".jpg"))
        # Rename the file
        os.rename(old_file, new_file)
