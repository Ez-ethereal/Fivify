import React from 'react';
import { View, Alert, TouchableOpacity, Text, Modal, Dimensions } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useState } from 'react';
import { ImageEditor } from "expo-dynamic-image-crop"

const SCREEN_WIDTH = Dimensions.get('window').width;

interface ImageCaptureProps {
  onImageSelected: (uri: string) => void;
}


export function ImageCapture({ onImageSelected }: ImageCaptureProps) {

  const [rawImageUri, setRawImageUri] = useState<string | null>(null);

  const handleClose = () => {
    setRawImageUri(null)
  }

  const handleCrop = (croppedImageData: any) => {
    setRawImageUri(null)
    onImageSelected(croppedImageData.uri)
  };

  const resizeForEditor = async (uri: string): Promise<string> => {
    const imageRef = await ImageManipulator.manipulate(uri)
      .resize({ width: SCREEN_WIDTH * 2 })
      .renderAsync();
    const result = await imageRef.saveAsync({ compress: 0.9, format: SaveFormat.JPEG });
    return result.uri;
  };

  const requestCameraPermissions = async () => {
    const cameraResult = await ImagePicker.requestCameraPermissionsAsync();
    return cameraResult.granted;
  };

  const requestGalleryPermissions = async () => {
    const galleryResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    return galleryResult.granted;
  };

  const takePhoto = async () => {
    const permission = await requestCameraPermissions();
    if (!permission) {
      Alert.alert(
        'Camera Access Required',
        'Please enable camera access in Settings to capture formulas.',
        [{ text: 'OK' }]
      );
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: false,
      quality: 0.95,
      mediaTypes: ['images'],
    });

    if (!result.canceled) {
      const uri = await resizeForEditor(result.assets[0].uri);
      setRawImageUri(uri);
    }
  };

  const pickFromGallery = async () => {
    const permission = await requestGalleryPermissions();
    if (!permission) {
      Alert.alert(
        'Photo Library Access Required',
        'Please enable photo library access in Settings to select formula images.',
        [{ text: 'OK' }]
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: false,
      quality: 0.8,
      mediaTypes: ['images'],
    });

    if (!result.canceled) {
      const uri = await resizeForEditor(result.assets[0].uri);
      setRawImageUri(uri);
    }
  };

  return (
    <View className="w-full">
      {/* Camera Button */}
      <TouchableOpacity
        className="flex-row items-center justify-center bg-brand-charcoal py-4 px-6 rounded-xl mb-3"
        onPress={takePhoto}
        activeOpacity={0.8}
      >
        <FontAwesome name="camera" size={20} color="#F5F0E8" style={{ marginRight: 8 }} />
        <Text className="text-brand-cream text-base font-semibold">Take Photo</Text>
      </TouchableOpacity>

      {/* Gallery Button */}
      <TouchableOpacity
        className="flex-row items-center justify-center bg-brand-surface border-2 border-brand-sand py-4 px-6 rounded-xl"
        onPress={pickFromGallery}
        activeOpacity={0.8}
      >
        <FontAwesome name="image" size={20} color="#3D4148" style={{ marginRight: 8 }} />
        <Text className="text-brand-charcoal text-base font-semibold">Choose from Gallery</Text>
      </TouchableOpacity>

      <Modal visible={!!rawImageUri} animationType="slide">
        <ImageEditor
          useModal={false}
          imageUri={rawImageUri}
          onEditingComplete={handleCrop}
          onEditingCancel={handleClose}
          dynamicCrop={true}
        />
      </Modal>
    </View>
  );
}
