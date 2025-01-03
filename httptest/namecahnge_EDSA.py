import os

def append_string_to_files(folder_path, append_string):
    # Check if the folder path exists
    if not os.path.isdir(folder_path):
        print("Folder does not exist.")
        return

    # Iterate through each file in the folder
    for filename in os.listdir(folder_path):
        file_path = os.path.join(folder_path, filename)
        
        # Check if the item is a file
        if os.path.isfile(file_path):
            # Separate file name and extension
            name, ext = os.path.splitext(filename)
            
            # Create the new file name by appending the string before the extension
            new_filename = f"{name}{append_string}{ext}"
            print(filename)

# Example usage
folder_path = "."  # Replace with the folder path
append_string = "_EDSA"            # Replace with the string to append
append_string_to_files(folder_path, append_string)