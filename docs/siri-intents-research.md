I asked Gemini if Siri and App Intents always required an Internet Connection. Since the main use case of the app is whenever service or internet are off (Bluetooth mesh communication) I wanted to know this prior implementing something that might not be used.

According to gemini: Siri and App Intents do not always require an internet connection. Thanks to on-device processing and Apple Intelligence, many common system commands (like setting timers, toggling Bluetooth, or opening apps) can be done completely offline. However, requests that require web searches or complex data will still need an internet connection.

What works offline?On supported devices (iPhone XS, XR, and newer), Siri handles your voice processing directly on the device. You can ask Siri to do the following without Wi-Fi or cellular data:

- Set alarms and timers.
- Launch specific apps.
- Turn device settings on or off (e.g., enable Airplane Mode, Low Power Mode, or Dark Mode).
- Control media playback (e.g., play, pause, or skip) on the device.

What requires internet?Because complex language reasoning, live data access, and information outside of your immediate device state are demanding, you will still need an active internet connection for:

- Searching the web or asking for general facts.
- Getting directions or traffic updates via Apple Maps.
- Checking weather updates or stock prices.
- Creating or managing cloud-based events in Calendar or Reminders.
- Third-party app actions that require cloud sync or data retrieval.

Then I asked if Custom Intents on a Custom App fit into this category. Let's say, I ask Siri something like:

> Siri, send this message to my Mesher contact 'John': I won't be there until 5 o'clock.

According to their response:

1. Voice-to-Text Parsing (Offline)
   Your device's local Apple Intelligence or on-device Siri engine translates your spoken words into text without sending data to the cloud. It recognizes "John" and "I won't be there until 5 o'clock" as variable arguments.

2. Intent Matching (Offline)
   Siri looks at the compiled App Intents schema package built into your app.

- How it routes: If you use Apple's pre-defined messaging schemas (like AssistantIntent domains), Siri maps your voice request directly to your app.
- How it resolves data: Siri calls your app's code in the background. Your app must use local App Entities to search your offline database for a contact named "John".

3. Once Siri extracts "John" and the message string, it triggers your intent's perform() method. What happens next determines if the entire action succeeds offline:

- Success: If your app is meant to queue the message locally (like a drafts folder or a peer-to-peer mesh network), the intent will finish successfully with no internet connection.
- Failure: If your app's code tries to immediately send that message to a cloud server, your app will trigger a network timeout error.

Then I asked about contact disambiguation for Siri:
When a user tells Siri to send a message to a contact name that yields multiple matches (e.g., two people named "John"), Siri does not guess. Instead, it uses Entity Resolution to dynamically halt execution and ask the user to clarify.

Because your custom app provides the contact data, your app's code is entirely responsible for finding the matches and telling Siri exactly how to ask the question.

Disambiguation process:

1. User says: "Send message to John"
2. Siri parses "John" -> App's Entity Query -> Finds: [John Smith, John Doe]
3. App throws: requestDisambiguation(among: [John Smith, John Doe])
4. Siri asks: "Which John did you mean?" (Shows visual list / reads names aloud)
5. User selects "John Doe" ──► App runs perform() with correct contact ID

In Apple's App Intents framework, your AppIntent struct handles the incoming command. When multiple contacts are found, you invoke a specific system function named requestDisambiguation.

```swift
import AppIntents

struct SendAppMessageIntent: AppIntent {
    static var title: LocalizedStringResource = "Send App Message"

    // Siri extracts the name "John" and assigns it here
    @Parameter(title: "Recipient Name")
    var recipientName: String

    @Parameter(title: "Message")
    var messageString: String

    @MainActor
    func perform() async throws -> some IntentResult {
        // 1. Query your app's local database for "John"
        let matchedContacts = try await ContactDatabase.shared.search(byName: recipientName)

        // 2. If nothing is found, ask Siri to prompt for a valid contact
        if matchedContacts.isEmpty {
            throw RequestValueValidationError.notFound
        }

        // 3. DISAMBIGUATION: If multiple Johns exist, make Siri ask the user
        var chosenContact: ContactEntity
        if matchedContacts.count > 1 {
            chosenContact = try await $recipientName.requestDisambiguation(
                among: matchedContacts,
                dialog: "Which \(recipientName) did you want to message?"
            )
        } else {
            chosenContact = matchedContacts.first!
        }

        // 4. Proceed to process the message locally using the resolved contact ID
        try await LocalMessageQueue.shared.enqueue(message: messageString, to: chosenContact.id)

        return .result(dialog: "Message sent to \(chosenContact.displayName).")
    }
}
```

When your code triggers requestDisambiguation, Siri pauses and adapts based on how the user is interacting with the device:

- If the user is looking at their phone: A visual overlay snippet drops down from the top of the screen. It displays a clean list of the matched contacts. Each contact can show its DisplayRepresentation—which includes a subtitle (like a phone number, relationship, or email) and a profile image to help the user choose instantly.
- If the user is using AirPods or CarPlay: Siri handles it purely over audio. Siri will read your custom dialog text aloud: "Which John did you want to message?" followed by the choices: "John Smith or John Doe?" The user simply speaks the name they want, and the intent safely resumes execution.

After this, Gemini started suggesting setting up App Entities and Contacts Indexing for Siri.
