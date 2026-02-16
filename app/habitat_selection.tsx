import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
    Button,
    Dialog,
    DialogClose,
    DialogContent,
    DialogOverlay,
    DialogPortal,
    DialogTrigger,
    Input,
    ScrollView,
    Separator,
    SizableText,
    Text,
    XStack,
    YStack
} from 'tamagui';

const data = {
    habitats: [
        {
            id: 1,
            name: "habitat_01",
            connection: "0001",
        },
        {
            id: 2,
            name: "habitat_02",
            connection: "0002",
        },
    ],
};

export default function HabitatSelection() {
    //router
    const router = useRouter()
    
    //states go here
    const [open, setOpen] = useState(false);

    //state for habitat name and connection address
    const [habitatName, setHabitatName] = useState("");
    const [connectionAddress, setConnectionAddress] = useState("");

    //habitats state to store the list of habitats
    const [habitats, setHabitats] = useState(data.habitats);

    //save button is enabled only if both habitat name and connection address are not empty & forms are unique
    const ifFormValid =
        habitatName.trim() !== "" &&
        connectionAddress.trim() !== "" &&
        !habitats.some((h) => {
            return (
                h.name.toLowerCase() === habitatName.trim().toLowerCase() ||
                h.connection.toLowerCase() === connectionAddress.trim().toLowerCase()
            );
        });

    return (
        <YStack
            flex={1}
            backgroundColor="white"
            items={"center"}
            width="100%"
            gap="$4"
        >
            <YStack
                flex={1}
                backgroundColor="blue"
                items={"center"}
                padding="$4"
                gap="$4"
                width={"100%"}
            >
                <Text color="black" fontSize="$6" fontWeight="bold"> Habitats Selection</Text>
                <Separator borderColor="black" alignSelf="stretch" />
                <YStack
                    flex={1}
                    backgroundColor="white"
                    items={"flex-start"}
                    width="100%"
                    gap="$4"
                    padding="$4"
                    rounded={20}
                >
                    <XStack flexWrap="wrap" justify={"space-between"} width="100%">
                        <Text color="black" fontSize="$3" fontWeight="bold"> My Habitats</Text>
                        <Dialog
                            modal
                            open={open}
                            onOpenChange={setOpen}
                        >
                            <DialogTrigger asChild>
                                <Button size="$2" theme="black_accent">
                                    Add
                                </Button>
                            </DialogTrigger>

                            <DialogPortal>
                                <DialogOverlay
                                    opacity={0.5}
                                    animateOnly={['transform', 'opacity']}
                                    transition={[
                                        'quicker',
                                        {
                                            opacity: {
                                                overshootClamping: true,
                                            },
                                        },
                                    ]}
                                    enterStyle={{ opacity: 0 }}
                                    exitStyle={{ opacity: 0 }}
                                />

                                <DialogContent
                                    bordered={true}
                                    elevation={20}
                                    transition={[
                                        'quicker',
                                        {
                                            opacity: {
                                                overshootClamping: true,
                                            },
                                        },
                                    ]}
                                    enterStyle={{ x: 0, y: 20, opacity: 0 }}
                                    exitStyle={{ x: 0, y: 10, opacity: 0, scale: 0.95 }}
                                    width={"80%"}
                                >
                                    <YStack gap="$2">
                                        <Text>Create New Habitat</Text>
                                        <Separator borderColor="$borderColor" />

                                        <SizableText size="$3"> Habitat Name </SizableText>
                                        <Input
                                            theme="surface1"
                                            size="$2"
                                            placeholder="Enter Habitat Name"
                                            value={habitatName}
                                            onChangeText={setHabitatName}
                                        />
                                        <SizableText size="$3"> Connection Address </SizableText>
                                        <Input
                                            theme="surface1"
                                            size="$2"
                                            placeholder="Enter Connection Address"
                                            value={connectionAddress}
                                            onChangeText={setConnectionAddress}
                                        />
                                        <XStack gap="$3" justify="flex-end">
                                            <DialogClose asChild>
                                                <Button onPress={() => {
                                                    setOpen(false)
                                                    setHabitatName("")
                                                    setConnectionAddress("")
                                                }} size="$3">
                                                    Close
                                                </Button>
                                            </DialogClose>
                                            <Button
                                                theme="black_accent"
                                                size="$3"
                                                onPress={() => {
                                                    //create new habitat object
                                                    const newHabitat = {
                                                        id: habitats.length + 1,
                                                        name: habitatName.trim(),
                                                        connection: connectionAddress.trim(),
                                                    };

                                                    // add to prev habitats
                                                    setHabitats((prev) => [...prev, newHabitat]);

                                                    // clear fields
                                                    setHabitatName("");
                                                    setConnectionAddress("");

                                                    // close
                                                    setOpen(false);
                                                }}
                                                disabled={!ifFormValid}
                                                disabledStyle={{
                                                    opacity: 0.5
                                                }}
                                            >Confirm</Button>
                                        </XStack>
                                    </YStack>
                                </DialogContent>
                            </DialogPortal>
                        </Dialog>
                    </XStack>
                    <Separator borderColor="black_accent" borderWidth={1} alignSelf="stretch" />
                    <ScrollView width="100%" rounded={10}>
                        <YStack gap="$3" width="100%">
                            {habitats.map((habitat) => (
                                <Button
                                    key={habitat.id}
                                    justify={"flex-start"}
                                    padding="$3"
                                    size="$6"
                                    backgroundColor="$blue3"
                                    hoverStyle={
                                        {
                                            background: "$blue4",
                                        }
                                    }
                                    onClick={() => {
                                        //navigate to habitat view
                                        router.navigate("/habitat_view");
                                    }}
                                    rounded={10}
                                >
                                    <YStack gap="$1">
                                        <Text color="black" fontSize="$4" fontWeight="bold">
                                            {habitat.name}
                                        </Text>
                                        <Text color="black">{habitat.connection}</Text>
                                    </YStack>
                                </Button>
                            ))}
                        </YStack>
                    </ScrollView>
                </YStack>
            </YStack>
        </YStack>
    );
}
