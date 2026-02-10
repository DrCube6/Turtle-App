import { Button, ButtonText } from "@/components/ui/button";
import { Heading } from "@/components/ui/heading";
import { HStack } from "@/components/ui/hstack/index.web";
import { CloseIcon, Icon } from "@/components/ui/icon";
import { Input, InputField } from "@/components/ui/input";
import {
  Modal,
  ModalBackdrop,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
} from "@/components/ui/modal";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack/index.web";
import { useState } from "react";

const data = {
  habitats: [
    {
      id: 1,
      name: "habitat_01",
      connection: "000",
    },
    {
      id: 2,
      name: "habitat_02",
      connection: "000",
    },
  ],
};

export default function HabitatView() {
  //modal state
  const [showModal, setShowModal] = useState(false);

  //state for habitat name and connection address
  const [habitatName, setHabitatName] = useState("");
  const [connectionAddress, setConnectionAddress] = useState("");

  //habitats state to store the list of habitats
  const [habitats, setHabitats] = useState(data.habitats);

  //save button is enabled only if both habitat name and connection address are not empty & forms are unique
  const ifFormValid =
    habitatName.trim() !== "" &&
    connectionAddress.trim() !== "" &&
    !data.habitats.some((h) => {
      return (
        h.name.toLowerCase() === habitatName.trim().toLowerCase() ||
        h.connection.toLowerCase() === connectionAddress.trim().toLowerCase()
      );
    });

  const handleCreateHabitat = () => {
    //add new habitat to habitats state
    setHabitats((prev) => [
      ...prev,
      {
        id: data.habitats.length + 1,
        name: habitatName.trim(),
        connection: connectionAddress.trim(),
      },
    ]);
    setShowModal(false);
    setHabitatName("");
    setConnectionAddress("");
  };
  return (
    <>
      <VStack
        space="2xl"
        className="self-center w-fit l-fit items-center gap-4 px-4 py-3 bg-primary-100 rounded-lg"
      >
        <HStack
          space="2xl"
          className="self-center w-fit items-center gap-4 px-4 py-3 bg-primary-300 rounded-lg"
        >
          <Text size="lg" className="text-primary-50" bold={true}>
            My Habitats
          </Text>
          <Button
            onPress={() => setShowModal(true)}
            className="w-[50px] self-center rounded-xl"
            variant="solid"
            size="xs"
            action="primary"
          >
            <ButtonText>Add</ButtonText>
          </Button>
          <Modal
            isOpen={showModal}
            onClose={() => {
              setShowModal(false);
              //reset form fields
              setHabitatName("");
              setConnectionAddress("");
            }}
            size="md"
          >
            <ModalBackdrop />
            <ModalContent>
              <ModalHeader>
                <Heading size="lg">Create Habitat</Heading>
                <ModalCloseButton>
                  <Icon as={CloseIcon} />
                </ModalCloseButton>
              </ModalHeader>
              <ModalBody>
                <VStack space="md">
                  <Text size="md">Habitat Name</Text>
                  <Input
                    variant="outline"
                    size="md"
                    isDisabled={false}
                    isInvalid={false}
                    isReadOnly={false}
                  >
                    <InputField
                      placeholder="Enter Habitat Name..."
                      value={habitatName}
                      onChangeText={setHabitatName}
                    />
                  </Input>
                  <Text size="md">Connect</Text>
                  <Input
                    variant="outline"
                    size="md"
                    isDisabled={false}
                    isInvalid={false}
                    isReadOnly={false}
                  >
                    <InputField
                      placeholder="Enter Connection Address..."
                      value={connectionAddress}
                      onChangeText={setConnectionAddress}
                    />
                  </Input>
                </VStack>
              </ModalBody>
              <ModalFooter>
                <Button
                  variant="solid"
                  action="secondary"
                  className="mr-3"
                  onPress={() => {
                    setShowModal(false);
                    //reset form fields
                    setHabitatName("");
                    setConnectionAddress("");
                  }}
                >
                  <ButtonText>Cancel</ButtonText>
                </Button>
                <Button
                  variant="solid"
                  action="positive"
                  isDisabled={!ifFormValid}
                  onPress={() => {
                    setShowModal(false);
                    //reset form fields
                    handleCreateHabitat();
                  }}
                >
                  <ButtonText>Create</ButtonText>
                </Button>
              </ModalFooter>
            </ModalContent>
          </Modal>
        </HStack>
        {habitats.map((habitat) => (
          <HStack
            space="2xl"
            className="self-center w-fit justify-end gap-4 px-4 py-3 bg-secondary-600 rounded-lg"
          >
            <Text size="md" className="text-primary-50" bold={true}>
              {habitat.name}
            </Text>
          </HStack>
        ))}
      </VStack>
    </>
  );
}
