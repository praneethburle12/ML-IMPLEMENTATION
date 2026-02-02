import cv2
import face_recognition
import os
import numpy as np
import sys

# --- WINDOWS DLL FIX ---
# This ensures that the dlib binaries are correctly found by the Python interpreter
if sys.platform == 'win32':
    import site
    for path in site.getsitepackages():
        dlib_path = os.path.join(path, "dlib")
        if os.path.exists(dlib_path):
            os.add_dll_directory(dlib_path)
            break

def load_training_data(directory):
    """
    Loads images from the local folder and generates face encodings.
    Uses upsampling to find small or difficult faces (like your anime/sketched images).
    """
    known_encodings = []
    known_names = []
    
    if not os.path.exists(directory):
        os.makedirs(directory)
        print(f"[*] Created '{directory}' folder. Please add your images and restart.")
        return [], []

    print("[*] Starting Offline Training...")
    
    for filename in os.listdir(directory):
        if filename.lower().endswith((".jpg", ".png", ".jpeg")):
            path = os.path.join(directory, filename)
            name = os.path.splitext(filename)[0].replace("_", " ").title()
            
            # Load the image file
            image = face_recognition.load_image_file(path)
            
            # Attempt 1: Standard Detection
            encodings = face_recognition.face_encodings(image)
            
            # Attempt 2: Upsampling (zoom in) if first attempt failed
            if not encodings:
                print(f"[!] Normal detection failed for {filename}. Retrying with upsampling...")
                # number_of_times_to_upsample=2 helps find smaller/blurry faces
                face_locations = face_recognition.face_locations(image, number_of_times_to_upsample=2, model="hog")
                encodings = face_recognition.face_encodings(image, known_face_locations=face_locations)

            if encodings:
                known_encodings.append(encodings[0])
                known_names.append(name)
                print(f"[+] Successfully learned: {name}")
            else:
                print(f"[-] ERROR: Could not find a clear face in '{filename}'.")
                print(f"    Tip: For characters like Nobita/Tanjiro, use a high-quality frontal close-up.")

    print(f"[*] Training complete. {len(known_names)} faces loaded.\n")
    return known_encodings, known_names

def main():
    # 1. Initialize data
    training_folder = "photos"
    known_face_encodings, known_face_names = load_training_data(training_folder)

    if not known_face_encodings:
        print("[!] No training data found. System will only show 'Unknown'.")

    # 2. Open Webcam
    video_capture = cv2.VideoCapture(0)
    print("[*] Webcam active. Press 'q' to quit.")

    while True:
        ret, frame = video_capture.read()
        if not ret:
            break

        # Flip frame for a more natural 'mirror' feel
        frame = cv2.flip(frame, 1)

        # Convert BGR (OpenCV) to RGB (face_recognition)
        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)

        # Find all faces in current webcam frame
        face_locations = face_recognition.face_locations(rgb_frame)
        face_encodings = face_recognition.face_encodings(rgb_frame, face_locations)

        for (top, right, bottom, left), face_encoding in zip(face_locations, face_encodings):
            # Compare current face to our offline 'database'
            # tolerance=0.5 makes it stricter (0.6 is default)
            matches = face_recognition.compare_faces(known_face_encodings, face_encoding, tolerance=0.5)
            name = "Unknown"

            # Use the closest match distance
            face_distances = face_recognition.face_distance(known_face_encodings, face_encoding)
            if len(face_distances) > 0:
                best_match_index = np.argmin(face_distances)
                if matches[best_match_index]:
                    name = known_face_names[best_match_index]

            # Draw UI
            color = (0, 255, 0) if name != "Unknown" else (0, 0, 255)
            cv2.rectangle(frame, (left, top), (right, bottom), color, 2)
            cv2.rectangle(frame, (left, bottom - 35), (right, bottom), color, cv2.FILLED)
            cv2.putText(frame, name, (left + 6, bottom - 10), cv2.FONT_HERSHEY_DUPLEX, 0.8, (255, 255, 255), 1)

        # Display output
        cv2.imshow('Face Recognition System (Offline)', frame)

        if cv2.waitKey(1) & 0xFF == ord('q'):
            break

    video_capture.release()
    cv2.destroyAllWindows()

if __name__ == "__main__":
    main()