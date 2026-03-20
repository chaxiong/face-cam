import face_recognition
import cv2
import numpy as np
import base64

def get_face_encodings(image_base64):
    # Decode base64 image
    encoded_data = image_base64.split(',')[1]
    nparr = np.frombuffer(base64.b64decode(encoded_data), np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    
    # Convert to RGB (OpenCV uses BGR)
    rgb_img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    
    # Find faces and encodings
    face_locations = face_recognition.face_locations(rgb_img)
    face_encodings = face_recognition.face_encodings(rgb_img, face_locations)
    
    return face_encodings

def identify_face(test_encoding, known_users):
    if not known_users:
        return "Unknown"
    
    known_encodings = [np.array(u["encoding"]) for u in known_users]
    known_names = [u["name"] for u in known_users]
    
    # Compare faces
    matches = face_recognition.compare_faces(known_encodings, test_encoding)
    name = "Unknown"
    
    # Use the known face with the smallest distance
    face_distances = face_recognition.face_distance(known_encodings, test_encoding)
    best_match_index = np.argmin(face_distances)
    if matches[best_match_index]:
        name = known_names[best_match_index]
    
    return name
